export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set on the server.' });
  }

  const { message, itineraryData, tasks } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const systemPrompt = `You are a helpful trip-planning assistant embedded in a family road trip itinerary app called "The Great North Tour".
You will be given the CURRENT itinerary data (an array of day objects) and CURRENT tasks (an array of checklist items), plus a user instruction.

Each day object has: day (number), date, title, focus, image (url), description, timeline (array of stops) OR, for split days, isSplit:true with car1Timeline and car2Timeline instead of timeline.
Each stop has: time, activity, type ("travel"|"landmark"|"food"|"shopping"), notes (optional), image (optional url), and for food stops an options array of { id, venue, cuisine, rating, suggestedOrder, maps }.
Each task has: id (number), text, completed (boolean), category.

Apply the user's requested change (add/remove/move/reorder stops, edit times or notes, change restaurant options, add/complete/remove tasks, etc.) directly to this data.

Respond with ONLY a single JSON object, no prose, no markdown fences, in this exact shape:
{"reply": "short plain-English confirmation of what you changed", "itineraryData": <full updated itinerary array, or null if unchanged>, "tasks": <full updated tasks array, or null if unchanged>}

Rules:
- Always return the FULL array for itineraryData and/or tasks if you changed anything in them, not a partial patch.
- Preserve every field you are not asked to change.
- If the instruction is just a question with no data change, set itineraryData and tasks to null and answer in "reply".
- Keep day numbers sequential starting at 1 if you add or remove a day; do not add or remove a whole day unless explicitly asked.
- Never include commentary outside the JSON object.`;

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tencent/hunyuan-a13b-instruct',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `CURRENT itineraryData:\n${JSON.stringify(itineraryData)}\n\nCURRENT tasks:\n${JSON.stringify(tasks)}\n\nUSER INSTRUCTION:\n${message}`,
          },
        ],
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      return res.status(orRes.status).json({ error: `OpenRouter API error: ${errText}` });
    }

    const data = await orRes.json();
    const text = data?.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      return res.status(200).json({ reply: text, itineraryData: null, tasks: null });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
}
