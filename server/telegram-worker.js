/* =============================================================================
   server/telegram-worker.js — НЕОБЯЗАТЕЛЬНЫЙ обработчик заявок (Cloudflare Worker)
   -----------------------------------------------------------------------------
   Принимает заявки и заказы с сайта (POST JSON) и пересылает их в Telegram-бот.
   Токен бота НЕ хранится в коде сайта — только в переменных окружения Worker:
     TG_TOKEN   — токен бота от @BotFather
     TG_CHAT_ID — ID чата/группы, куда слать заявки
     ALLOW_ORIGIN — адрес вашего сайта, например https://rozmarin-cafe.ru
   После деплоя впишите адрес Worker в assets/js/config.js → formEndpoint.
   ВАЖНО (152-ФЗ): для хранения данных граждан РФ используйте серверы в РФ;
   этот Worker только пересылает сообщение и ничего не сохраняет.
   ============================================================================= */
const TITLES = { order: "🛒 Заказ", booking: "📅 Бронь", banquet: "🎉 Банкет", callback: "📞 Обратный звонок", subscribe: "✉️ Подписка" };

export default {
  async fetch(request, env) {
    // CORS: разрешаем запросы только с вашего сайта
    const cors = { "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

    let body;
    try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400, headers: cors }); }
    const d = body.data || {};
    // Без согласия на обработку ПДн заявку не принимаем
    if (d.consent !== true) return new Response("Consent required", { status: 400, headers: cors });

    const lines = [TITLES[body.type] || "Заявка", ""];
    if (body.type === "order" && Array.isArray(body.cart)) {
      body.cart.forEach((i, n) => lines.push(`${n + 1}. ${i.name} × ${i.qty} = ${i.qty * i.price} ₽`));
      lines.push(`Итого: ${body.total} ₽`, "");
    }
    for (const [k, v] of Object.entries(d)) if (k !== "consent" && v !== "" && v != null) lines.push(`${k}: ${v === true ? "да" : v === false ? "нет" : v}`);

    const tg = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: lines.join("\n").slice(0, 4000) })
    });
    return new Response(tg.ok ? "ok" : "telegram error", { status: tg.ok ? 200 : 502, headers: cors });
  }
};
