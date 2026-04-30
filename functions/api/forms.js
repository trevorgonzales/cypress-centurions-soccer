const DEFAULT_FORMS_FOLDER_ID = "1s9IHeqYyMPdcfXiyHine0BFzlQXKnl8S";

function normalizeDriveFile(file) {
  return {
    id: file.id,
    name: file.name,
    url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    mimeType: file.mimeType,
  };
}

export async function onRequestGet(context) {
  const apiKey = context.env.GOOGLE_DRIVE_API_KEY;
  const folderId = context.env.GOOGLE_DRIVE_FORMS_FOLDER_ID || DEFAULT_FORMS_FOLDER_ID;

  if (!apiKey) {
    return Response.json(
      {
        error: "Google Drive forms integration is not configured.",
        forms: [],
      },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
    orderBy: "name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return Response.json(
        { error: "Unable to fetch forms.", forms: [] },
        { status: 502 }
      );
    }

    const data = await response.json();
    const forms = (data.files || []).map(normalizeDriveFile);

    return Response.json(
      { forms },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (error) {
    return Response.json(
      { error: "Unable to load forms.", forms: [] },
      { status: 500 }
    );
  }
}
