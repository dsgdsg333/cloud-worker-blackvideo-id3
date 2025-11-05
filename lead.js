// Пример функции — отправляет данные так же, как PHP curl + http_build_query
export async function sendToApi({
                                    ip,
                                    countryCode,
                                    phoneNumber,
                                    firstName,
                                    lastName,
                                    email,
                                    affiliate_id
                                } = {}) {
    // Собираем payload в том же виде, что и http_build_query (вложенные ключи profile[...])
    const params = new URLSearchParams();
    params.append("ip", ip ?? "");
    params.append("country_code", countryCode ?? "");

    // profile[...] как в PHP
    params.append("profile[phone]", phoneNumber ?? "");
    params.append("profile[first_name]", firstName ?? "");
    params.append("profile[last_name]", lastName ?? "");
    params.append("profile[email]", email ?? "");
    params.append("profile[password]", "qwerty12345");

    params.append("aff_sub", "xxx-xxx-workers");
    params.append("affiliate_id", affiliate_id ?? "");
    params.append("offer_id", "1");
    params.append("aff_sub4", "GovermentProject");

    // Если нужно — можно посмотреть закодированную строку:
    // const bodyStr = params.toString();

    try {
        const res = await fetch("https://otp.groscloud.com/workers_api/webhook.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: params.toString(), // URLSearchParams тоже можно передать напрямую
        });

        // В PHP ты делал curl_exec и получал строку — аналог: text()
        const text = await res.text();

        // Можно вернуть объект с кодом и телом, как удобно:
        return { ok: res.ok, status: res.status, response: text };
    } catch (err) {
        // Обработка ошибок (в Cloudflare Worker fetch реджектит при сетевых ошибках)
        return { ok: false, error: String(err) };
    }
}