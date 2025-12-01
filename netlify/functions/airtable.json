/* global fetch */
// netlify/functions/airtable.js

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { tableName, filterFormula } = JSON.parse(event.body || '{}');

    if (!tableName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'tableName is required' }),
      };
    }

    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_PAT;

    if (!baseId || !apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Airtable config missing on server' }),
      };
    }

    // Build query params
    const params = new URLSearchParams();
    if (filterFormula) {
      params.append('filterByFormula', filterFormula);
    }

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
      tableName
    )}?${params.toString()}`;

    // Call Airtable securely from the server
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Airtable error:', response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Airtable API error',
          status: response.status,
          body: text,
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Netlify Airtable function error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server error',
        details: error.message,
      }),
    };
  }
};
