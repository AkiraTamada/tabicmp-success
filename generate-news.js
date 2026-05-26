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
    messages: [
      {
        role: "user",
        content: `You are a JSON generator. Output ONLY a JSON object with no explanation, no markdown, no code blocks.

Generate 9 realistic Japanese travel news articles for ${today}.

Use these real news source URLs:
- https://www.traicy.com (航空系)
- https://www.travelvoice.jp (旅行業界)
- https://flyteam.jp (航空系)
- https://www.jiji.com/jc/c?g=tra (時事通信旅行)
- https://www.nta.co.jp (日本旅行)
- https://www.jtb.co.jp (JTB)
- https://www.ana.co.jp/ja/jp/ (ANA)
- https://www.jal.co.jp/jp/ja/ (JAL)

Output format (JSON only, no other text):
{"topNews":{"category":"料金・セール","categoryEn":"price","title":"タイトル","excerpt":"要約2-3文","source":"Travel Voice","time":"2時間前","url":"https://www.travelvoice.jp"},"articles":[{"category":"航空・フライト","categoryEn":"flight","title":"タイトル","excerpt":"要約1-2文","source":"Traicy","time":"3時間前","url":"https://www.traicy.com"},{"category":"ホテル・宿泊","categoryEn":"hotel","title":"タイトル","excerpt":"要約","source":"Travel Voice","time":"4時間前","url":"https://www.travelvoice.jp"},{"category":"国内旅行","categoryEn":"domestic","title":"タイトル","excerpt":"要約","source":"JTB","time":"5時間前","url":"https://www.jtb.co.jp"},{"category":"海外旅行","categoryEn":"overseas","title":"タイトル","excerpt":"要約","source":"Travel Voice","time":"6時間前","url":"https://www.travelvoice.jp"},{"category":"料金・セール","categoryEn":"price","title":"タイトル","excerpt":"要約","source":"ANA","time":"7時間前","url":"https://www.ana.co.jp/ja/jp/"},{"category":"規制・ビザ","categoryEn":"visa","title":"タイトル","excerpt":"要約","source":"時事通信","time":"8時間前","url":"https://www.jiji.com/jc/c?g=tra"},{"category":"AI×旅行","categoryEn":"ai","title":"タイトル","excerpt":"要約","source":"Travel Voice","time":"9時間前","url":"https://www.travelvoice.jp"},{"category":"航空・フライト","categoryEn":"flight","title":"タイトル","excerpt":"要約","source":"Flyteam","time":"10時間前","url":"https://flyteam.jp"}]}`
      }
    ]
  });

  let jsonText = response.content[0].text.trim();
  jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();

  console.log("レスポンス:", jsonText.substring(0, 100));
  
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
