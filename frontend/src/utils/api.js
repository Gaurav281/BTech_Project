const API_BASE_URL = 'http://localhost:8000/api'

export const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const token = localStorage.getItem('token')
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }
      
      return data
    } catch (error) {
      throw error
    }
  },

  signup(userData) {
    return this.request('/signup', {
      method: 'POST',
      body: userData
    })
  },

  login(credentials) {
    return this.request('/login', {
      method: 'POST',
      body: credentials
    })
  },

  googleAuth(accessToken) {
    return this.request('/auth/google', {
      method: 'POST',
      body: { access_token: accessToken }
    })
  },

  getProfile() {
    return this.request('/profile')
  },

  logout() {
    return this.request('/logout', {
      method: 'POST'
    })
  },

  healthCheck() {
    return this.request('/health')
  }
}