export default async function handler(req, res) {
  const { method, body, query } = req;
  const { token, entryId } = query;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  const auth = Buffer.from(`${token}:api_token`).toString('base64');

  try {
    if (method === 'POST') {
      const meRes = await fetch('https://api.track.toggl.com/api/v9/me', {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const meData = await meRes.json();
      const workspace_id = meData.default_workspace_id;

      const response = await fetch('https://api.track.toggl.com/api/v9/workspaces/' + workspace_id + '/time_entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ ...body, wid: workspace_id })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    if (method === 'GET') {
      const response = await fetch('https://api.track.toggl.com/api/v9/me/time_entries/current', {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    if (method === 'PATCH' && entryId) {
      const meRes = await fetch('https://api.track.toggl.com/api/v9/me', {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const meData = await meRes.json();
      const workspace_id = meData.default_workspace_id;

      const response = await fetch(`https://api.track.toggl.com/api/v9/workspaces/${workspace_id}/time_entries/${entryId}/stop`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        }
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(400).json({ error: 'Invalid request', method, entryId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
