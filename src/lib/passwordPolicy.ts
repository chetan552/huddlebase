export const PASSWORD_POLICY_MESSAGE = 'Password must be at least 10 characters and include letters and numbers';

export function isStrongPassword(password: string) {
    return password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
