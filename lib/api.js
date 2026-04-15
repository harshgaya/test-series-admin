// Standard API response helpers

export function successResponse(data, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function errorResponse(message, status = 400) {
  return Response.json({ success: false, error: message }, { status })
}

export function unauthorizedResponse() {
  return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

export function notFoundResponse(resource = 'Record') {
  return Response.json({ success: false, error: `${resource} not found` }, { status: 404 })
}

// Parse pagination params from URL
export function getPagination(searchParams) {
  const page  = parseInt(searchParams.get('page')  || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip  = (page - 1) * limit
  return { page, limit, skip }
}
