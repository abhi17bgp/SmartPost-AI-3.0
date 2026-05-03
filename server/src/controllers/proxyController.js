const axios = require('axios');
const catchAsync = require('../utils/catchAsync');
const FormData = require('form-data');

exports.proxyRequest = catchAsync(async (req, res) => {
  let url, method, headers, data, isMultipart;

  if (req.is('multipart/form-data')) {
    url = req.body.url;
    method = req.body.method;
    try {
      headers = req.body.headers ? JSON.parse(req.body.headers) : {};
    } catch(e) {
      headers = {};
    }
    isMultipart = req.body.isMultipart === 'true';
    data = req.body.data;
  } else {
    url = req.body.url;
    method = req.body.method;
    headers = req.body.headers;
    data = req.body.data;
  }

  if (!url) {
    return res.status(400).json({ status: 'fail', message: 'URL is required' });
  }

  let finalData = data;
  let finalHeaders = headers || {};

  if (isMultipart) {
    finalData = new FormData();
    // Reconstruct text fields
    for (const [key, value] of Object.entries(req.body)) {
      if (key.startsWith('data_text_')) {
        const actualKey = key.replace('data_text_', '');
        finalData.append(actualKey, value);
      }
    }
    // Reconstruct files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.fieldname.startsWith('data_file_')) {
          const actualKey = file.fieldname.replace('data_file_', '');
          finalData.append(actualKey, file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
          });
        }
      }
    }
    // Set proper headers for multipart
    finalHeaders = { ...finalHeaders, ...finalData.getHeaders() };
  } else if (typeof finalData === 'string' && req.is('multipart/form-data')) {
    // If it was just a raw string/JSON sent over multipart but not explicitly 'form-data' mode
    try {
      finalData = JSON.parse(finalData);
    } catch(e) {}
  }

  const startTime = Date.now();

  try {
    const response = await axios({
      url,
      method: method || 'GET',
      headers: finalHeaders,
      data: finalData,
      validateStatus: () => true, // Don't throw errors for non-2xx status codes
      timeout: 10000 // 10 second timeout
    });

    const timeTaken = Date.now() - startTime;

    res.status(200).json({
      status: 'success',
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        timeTaken
      }
    });
  } catch (error) {
    const timeTaken = Date.now() - startTime;
    res.status(500).json({
      status: 'error',
      message: error.message,
      data: {
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Internal Server Error',
        headers: error.response?.headers || {},
        data: error.response?.data || error.message,
        timeTaken
      }
    });
  }
});
