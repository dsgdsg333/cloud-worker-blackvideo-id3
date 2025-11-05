// Import landing page HTML and CSS as raw text
import htmlContent from './landing/index.html';
import cssContent from './landing/style.css';
import ThankYouContent from './landing/thankyou.html';
import { adspect } from "./adpect.js";
import { sendToApi } from "./lead.js";


const affiliate_id = "3";
const SID = "3ee58196-ca52-4806-b726-9df5e0da3c88";

const vide_ID_white = "vidalytics_embed_Dgaa9y0nmeNVoQAy";
const vide_LINK_white = "https://fast.vidalytics.com/embeds/vBFA2Mrf/Dgaa9y0nmeNVoQAy/";

const vide_ID_black = "vidalytics_embed_H6TBQJnhadgqJY4j";
const vide_LINK_black = "https://fast.vidalytics.com/embeds/vBFA2Mrf/H6TBQJnhadgqJY4j/";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve CSS file
    if (path === '/style.css') {
      return new Response(cssContent, {
        headers: { 'content-type': 'text/css; charset=utf-8' },
      });
    }

    // Handle lead submission
    if (path === '/lead' && request.method === 'POST') {
      try {
        const ip =
            request.headers.get("CF-Connecting-IP") ||
            request.headers.get("True-Client-IP") ||
            request.headers.get("X-Forwarded-For")?.split(",").pop()?.trim() ||
            request.headers.get("X-Real-IP") ||
            "0.0.0.0";

        const leadData = await request.json();
        const fullName = (leadData.fullName || "").trim();
        const [firstName = "Unknown", ...rest] = fullName.split(/\s+/);
        const lastName = rest.join(" ") || "Unknown";

        const result = await sendToApi({
          ip,
          countryCode: "CA",
          phoneNumber: leadData.phone,
          firstName,
          lastName,
          email: leadData.email,
          affiliate_id,
        });

        return new Response("Good", {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });

      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid data' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    // Handle thank you page
    if (path === '/thankyou') {
      return new Response(ThankYouContent, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (path !== "/") {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const cloaking = await adspect(request, SID);

    let modifiedHtml;
    if(cloaking.ok){
        modifiedHtml = htmlContent.replaceAll("vidalytics_video_id_replace", vide_ID_black);
        modifiedHtml = modifiedHtml.replaceAll("vidalytics_video_link_replace", vide_LINK_black);
    }else{
        modifiedHtml = htmlContent.replaceAll("vidalytics_video_id_replace", vide_ID_white);
        modifiedHtml = modifiedHtml.replaceAll("vidalytics_video_link_replace", vide_LINK_white);
    }

    // Serve HTML for all other routes
    return new Response(modifiedHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};
