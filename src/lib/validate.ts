export const validate = {
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
  },

  password: (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password.length > 128) return 'Password too long'
    return null
  },

  text: (text: string, maxLength = 1000): string => {
    return text.trim().slice(0, maxLength)
  },

  workspaceName: (name: string): string | null => {
    if (name.trim().length < 2) return 'Name must be at least 2 characters'
    if (name.trim().length > 100) return 'Name too long'
    return null
  },
}
