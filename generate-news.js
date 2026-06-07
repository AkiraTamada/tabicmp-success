const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");

const client = new Anthropic();

async function searchNews() {
  console.log("ニュース検索開始...");
  
  const searchResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: "Search for the latest Japanese travel news today. Search for: '旅行 ニュース 最新 2026' and '航空券 セール 最新' and 'ホテル 新規オープン 2026'. Return a plain text list of up to 9 news items with: title, URL, and one-sentence summary. Nothing else."
    }]
  });

  let searchText = "";
  for (const block of searchResponse.content) {
    if (block.type === "text") searchText += block.text;
  }
  return searchText;
}

async function convertToJSON(searchText, today) {
  console.log("JSON変換中...");
  
  const jsonResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `Convert this news list to JSON. Output ONLY the JSON object, no markdown, no explanation.

News data:
${searchText}

Output this exact JSON structure:
{"topNews":{"category":"料金・セール","categoryEn":"price","title":"タイトル","excerpt":"要約2文","source":"ソース名","time":"2時間前","url":"https://actual-url.com"},"articles":[{"category":"航空・フライト","categoryEn":"flight","title":"タイトル","excerpt":"要約1文","source":"ソース名","time":"3時間前","url":"https://actual-url.com"}]}

Rules:
- Use categoryEn: flight, hotel, domestic, overseas, price, visa, ai
- Include 8 articles total
- Use the ACTUAL URLs from the news data above
- Output ONLY the JSON, absolutely nothing else`
    }]
  });

  return jsonResponse.content[0].text.trim()
    .replace(/^```json\n?/, '').replace(/\n?```$/, '')
    .replace(/^```\n?/, '').replace(/\n?```$/, '')
    .trim();
}

function getCategoryBadge(categoryEn, categoryJa) {
  const map = {
    flight:   { emoji: "✈️", cls: "badge-flight" },
    hotel:    { emoji: "🏨", cls: "badge-hotel" },
    domestic: { emoji: "🗾", cls: "badge-domestic" },
    overseas: { emoji: "🌍", cls: "badge-overseas" },
    price:    { emoji: "💴", cls: "badge-price" },
    visa:     { emoji: "📋", cls: "badge-visa" },
    ai:       { emoji: "🤖", cls: "badge-ai" },
  };
  const c = map[categoryEn] || { emoji: "📰", cls: "badge-visa" };
  return `<span class="badge ${c.cls}">${c.emoji} ${categoryJa}</span>`;
}

function generateHTML(news, today) {
  const template = fs.readFileSync("travel-news-hub.html", "utf-8");

  const topNewsHTML = `
  <div class="featured-article">
    <div class="featured-content">
      ${getCategoryBadge(news.topNews.categoryEn, news.topNews.category)}
      <h2 class="featured-title">${news.topNews.title}</h2>
      <p class="featured-excerpt">${news.topNews.excerpt}</p>
      <div class="featured-meta">
        <span>${news.topNews.source}</span>
        <span>·</span>
        <span>${news.topNews.time}</span>
      </div>
    </div>
    <a href="${news.topNews.url}" target="_blank" rel="noopener" class="read-more">
      READ MORE
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
  </div>`;

  const cardsHTML = news.articles.map(a => `
    <div class="news-card" data-cat="${a.categoryEn}">
      <div class="card-top">
        <span class="card-source">${a.source}</span>
        <span class="card-time">${a.time}</span>
      </div>
      <div class="card-badges">${getCategoryBadge(a.categoryEn, a.category)}</div>
      <p class="card-title">${a.title}</p>
      <p class="card-excerpt">${a.excerpt}</p>
      <div class="card-footer">
        <span class="card-time">${a.source}</span>
        <a href="${a.url}" target="_blank" rel="noopener" class="card-read-more">READ MORE →</a>
      </div>
    </div>`).join("\n");

  const totalCount = news.articles.length + 1;

  let html = template;
  html = html.replace(
    /<!-- TOPNEWS_START -->[\s\S]*?<!-- TOPNEWS_END -->/,
    `<!-- TOPNEWS_START -->${topNewsHTML}<!-- TOPNEWS_END -->`
  );
  html = html.replace(
    /<!-- CARDS_START -->[\s\S]*?<!-- CARDS_END -->/,
    `<!-- CARDS_START -->${cardsHTML}<!-- CARDS_END -->`
  );
  html = html.replace(
    /最終更新：[\d:]+/,
    `最終更新：${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })}`
  );
  html = html.replace(
    /\d{4}\/\d{2}\/\d{2} \d+:\d+ 更新/,
    `${today} 更新`
  );
  html = html.replace(
    /<span class="stat-num" id="total-count">\d+<\/span>/,
    `<span class="stat-num" id="total-count">${totalCount}</span>`
  );

  fs.writeFileSync("travel-news-hub.html", html);
  console.log(`完了！記事数: ${totalCount}件`);
}

async function main() {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "Asia/Tokyo"
  });

  const searchText = await searchNews();
  console.log("検索完了。JSON変換中...");
  
  const jsonText = await convertToJSON(searchText, today);
  console.log("レスポンス先頭:", jsonText.substring(0, 50));
  
  const news = JSON.parse(jsonText);
  generateHTML(news, today);
}

main().catch(console.error);
