// api/toggl.js

export default async function handler(req, res) {
  // 1. 요청에서 필요한 정보(토큰, ID, 데이터)를 꺼냅니다.
  const { token, entryId } = req.query;
  const method = req.method;
  const body = req.body;

  if (!token) {
    return res.status(400).json({ error: 'API Token is missing' });
  }

  // 2. Toggl API 주소를 만듭니다.
  // entryId가 있으면 (삭제/수정 시) URL 뒤에 붙입니다.
  let togglUrl = 'https://api.track.toggl.com/api/v9/time_entries';
  if (entryId) {
    togglUrl += `/${entryId}`;
  }

  // 3. Toggl 인증 헤더를 만듭니다 (Basic Auth)
  const auth = Buffer.from(`${token}:api_token`).toString('base64');

  try {
    // 4. 진짜 Toggl 서버로 요청을 보냅니다.
    const response = await fetch(togglUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 5. Toggl의 응답을 그대로 내 앱으로 돌려줍니다.
    if (response.ok) {
      // DELETE 등 내용 없는 응답 처리
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return res.status(200).json(data);
    } else {
      return res.status(response.status).json({ error: 'Toggl Error' });
    }

  } catch (error) {
    console.error('Vercel Function Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
