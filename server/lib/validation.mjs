/**
 * Input validation utilities using simple validation rules.
 * In production, consider using Zod for more robust validation.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

/**
 * Validate registration input
 */
export function validateRegistration(body) {
  const errors = [];

  // First Name
  if (!body.firstName || typeof body.firstName !== 'string' || body.firstName.trim().length < 1) {
    errors.push({ field: 'firstName', message: 'First name is required.' });
  } else if (body.firstName.trim().length > 50) {
    errors.push({ field: 'firstName', message: 'First name must be 50 characters or less.' });
  }

  // Last Name
  if (!body.lastName || typeof body.lastName !== 'string' || body.lastName.trim().length < 1) {
    errors.push({ field: 'lastName', message: 'Last name is required.' });
  } else if (body.lastName.trim().length > 50) {
    errors.push({ field: 'lastName', message: 'Last name must be 50 characters or less.' });
  }

  // Username
  if (!body.username || typeof body.username !== 'string' || body.username.trim().length < 3) {
    errors.push({ field: 'username', message: 'Username must be at least 3 characters.' });
  } else if (body.username.trim().length > 30) {
    errors.push({ field: 'username', message: 'Username must be 30 characters or less.' });
  } else if (!USERNAME_REGEX.test(body.username.trim())) {
    errors.push({ field: 'username', message: 'Username can only contain letters, numbers, hyphens, and underscores.' });
  }

  // Email
  if (!body.email || typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  // Phone
  if (!body.phone || typeof body.phone !== 'string' || body.phone.trim().length < 7) {
    errors.push({ field: 'phone', message: 'A valid phone number is required.' });
  } else if (!PHONE_REGEX.test(body.phone.trim())) {
    errors.push({ field: 'phone', message: 'Invalid phone number format.' });
  }

  // Password
  if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  } else if (body.password.length > 128) {
    errors.push({ field: 'password', message: 'Password must be 128 characters or less.' });
  } else {
    // Password strength check
    const hasUpper = /[A-Z]/.test(body.password);
    const hasLower = /[a-z]/.test(body.password);
    const hasNumber = /\d/.test(body.password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(body.password);

    const strengthIssues = [];
    if (!hasUpper) strengthIssues.push('an uppercase letter');
    if (!hasLower) strengthIssues.push('a lowercase letter');
    if (!hasNumber) strengthIssues.push('a number');
    if (!hasSpecial) strengthIssues.push('a special character');

    if (strengthIssues.length > 0) {
      errors.push({
        field: 'password',
        message: `Password must contain: ${strengthIssues.join(', ')}.`,
      });
    }
  }

  // Confirm Password
  if (body.password !== body.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
  }

  // Country
  if (!body.country || typeof body.country !== 'string' || body.country.trim().length < 2) {
    errors.push({ field: 'country', message: 'Country is required.' });
  }

  // Terms & Privacy
  if (body.termsAccepted !== true && body.termsAccepted !== 'true') {
    errors.push({ field: 'termsAccepted', message: 'You must accept the Terms & Conditions.' });
  }
  if (body.privacyAccepted !== true && body.privacyAccepted !== 'true') {
    errors.push({ field: 'privacyAccepted', message: 'You must accept the Privacy Policy.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      username: body.username?.trim()?.toLowerCase(),
      email: body.email?.trim()?.toLowerCase(),
      phone: body.phone?.trim(),
      password: body.password,
      country: body.country?.trim(),
      city: body.city?.trim() || null,
    },
  };
}

/**
 * Validate login input
 */
export function validateLogin(body) {
  const errors = [];

  if (!body.email || typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (!body.password || typeof body.password !== 'string' || body.password.length < 1) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      email: body.email?.trim()?.toLowerCase(),
      password: body.password,
    },
  };
}

/**
 * Validate forgot password request
 */
export function validateForgotPassword(body) {
  const errors = [];

  if (!body.email || typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      email: body.email?.trim()?.toLowerCase(),
    },
  };
}

/**
 * Validate password reset
 */
export function validateResetPassword(body) {
  const errors = [];

  if (!body.token || typeof body.token !== 'string' || body.token.trim().length < 10) {
    errors.push({ field: 'token', message: 'A valid reset token is required.' });
  }

  if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  } else {
    const hasUpper = /[A-Z]/.test(body.password);
    const hasLower = /[a-z]/.test(body.password);
    const hasNumber = /\d/.test(body.password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(body.password);

    const strengthIssues = [];
    if (!hasUpper) strengthIssues.push('an uppercase letter');
    if (!hasLower) strengthIssues.push('a lowercase letter');
    if (!hasNumber) strengthIssues.push('a number');
    if (!hasSpecial) strengthIssues.push('a special character');

    if (strengthIssues.length > 0) {
      errors.push({
        field: 'password',
        message: `Password must contain: ${strengthIssues.join(', ')}.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      token: body.token?.trim(),
      password: body.password,
    },
  };
}

/**
 * Validate seller application
 */
export function validateSellerApplication(body) {
  const errors = [];

  const requiredFields = [
    { field: 'fullLegalName', label: 'Full legal name', max: 100 },
    { field: 'storeName', label: 'Store name', max: 100 },
    { field: 'phone', label: 'Phone number', max: 20 },
    { field: 'email', label: 'Email', max: 255 },
    { field: 'country', label: 'Country', max: 50 },
    { field: 'stateProvince', label: 'State/Province', max: 50 },
    { field: 'city', label: 'City', max: 50 },
    { field: 'fullAddress', label: 'Full address', max: 200 },
    { field: 'postalCode', label: 'Postal code', max: 20 },
    { field: 'storeDescription', label: 'Store description', max: 1000 },
  ];

  for (const { field, label, max } of requiredFields) {
    if (!body[field] || typeof body[field] !== 'string' || body[field].trim().length < 1) {
      errors.push({ field, message: `${label} is required.` });
    } else if (body[field].trim().length > max) {
      errors.push({ field, message: `${label} must be ${max} characters or less.` });
    }
  }

  if (body.email && !EMAIL_REGEX.test(body.email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (body.termsAccepted !== true && body.termsAccepted !== 'true') {
    errors.push({ field: 'termsAccepted', message: 'You must accept the seller terms.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      fullLegalName: body.fullLegalName?.trim(),
      storeName: body.storeName?.trim(),
      phone: body.phone?.trim(),
      email: body.email?.trim()?.toLowerCase(),
      country: body.country?.trim(),
      stateProvince: body.stateProvince?.trim(),
      city: body.city?.trim(),
      fullAddress: body.fullAddress?.trim(),
      postalCode: body.postalCode?.trim(),
      storeDescription: body.storeDescription?.trim(),
      productCategories: body.productCategories || '[]',
    },
  };
}

/**
 * Validate profile update
 */
export function validateProfileUpdate(body) {
  const errors = [];

  if (body.firstName !== undefined) {
    if (!body.firstName || body.firstName.trim().length < 1) {
      errors.push({ field: 'firstName', message: 'First name cannot be empty.' });
    }
  }

  if (body.lastName !== undefined) {
    if (!body.lastName || body.lastName.trim().length < 1) {
      errors.push({ field: 'lastName', message: 'Last name cannot be empty.' });
    }
  }

  if (body.username !== undefined) {
    if (body.username.trim().length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters.' });
    } else if (!USERNAME_REGEX.test(body.username.trim())) {
      errors.push({ field: 'username', message: 'Username can only contain letters, numbers, hyphens, and underscores.' });
    }
  }

  if (body.phone !== undefined && body.phone.trim().length > 0) {
    if (!PHONE_REGEX.test(body.phone.trim())) {
      errors.push({ field: 'phone', message: 'Invalid phone number format.' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      username: body.username?.trim()?.toLowerCase(),
      phone: body.phone?.trim(),
      country: body.country?.trim(),
      city: body.city?.trim() || null,
    },
  };
}

/**
 * Validate password change
 */
export function validatePasswordChange(body) {
  const errors = [];

  if (!body.currentPassword || typeof body.currentPassword !== 'string') {
    errors.push({ field: 'currentPassword', message: 'Current password is required.' });
  }

  if (!body.newPassword || typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
    errors.push({ field: 'newPassword', message: 'New password must be at least 8 characters.' });
  } else {
    const hasUpper = /[A-Z]/.test(body.newPassword);
    const hasLower = /[a-z]/.test(body.newPassword);
    const hasNumber = /\d/.test(body.newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(body.newPassword);

    const strengthIssues = [];
    if (!hasUpper) strengthIssues.push('an uppercase letter');
    if (!hasLower) strengthIssues.push('a lowercase letter');
    if (!hasNumber) strengthIssues.push('a number');
    if (!hasSpecial) strengthIssues.push('a special character');

    if (strengthIssues.length > 0) {
      errors.push({
        field: 'newPassword',
        message: `Password must contain: ${strengthIssues.join(', ')}.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}