import api from './api'

export async function createBooking(body: any) {
  // POST /api/bookings
  return api.post('/bookings', body)
}

export async function getMyBookings() {
  return api.get('/bookings/my')
}

export default { createBooking, getMyBookings }
