const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");

const client = new Anthropic();

async function generateNews() {
  console.log("ニュース収集開始...");

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "Asia/Tokyo"
  });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: `Search for today's latest Japanese travel news (${today}) and return ONLY a JSON object.

Search for: 旅行ニュース 最新, 航空券 セール, ホテル 新規オープン, 海外旅行 ビザ, 国内旅行 キャンペーン

Return this exact JSON with REAL URLs from search results:
{
  "topNews": {
    "category": "カテゴリ名",
    "categoryEn": "price",
    "title": "記事タイトル",
    "excerpt": "要約2-3文",
    "source": "ソース名",
    "time": "X時間前",
    "url": "実際のURL"
  },
  "articles": [
    {
      "category": "カテゴリ名",
      "categoryEn": "flight",
      "title": "記事タイトル",
      "excerpt": "要約1-2文",
      "source": "ソース名",
      "time": "X時間前",
      "url": "実際のURL"
    }
  ]
}

Use categoryEn values: flight, hotel, domestic, overseas, price, visa, ai
Return 8 articles total. Return ONLY the JSON object, no other text.`
    }]
  });

  let jsonText = "";
  for (const block of response.content) {
    if (block.type === "text") jsonText += block.text;
  }
  jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  const news = JSON.parse(jsonText);
  console.log("ニュース取得完了。HTML生成中...");
  generateHTML(news, today);
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

generateNews().catch(console.error);
