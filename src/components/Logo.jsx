import React from 'react'

const Logo = ({ 
  size = 'medium', 
  className = '', 
  showDropShadow = false,
  variant = 'black', // 'black' or 'original'
  showText = false, // Show text under logo
  text = 'JGEx',
  alt = 'JG Travelex Logo'
}) => {
  // Size variants for different use cases
  const sizeClasses = {
    small: 'h-6 w-auto',
    medium: 'h-8 w-auto', 
    large: 'h-16 w-auto',
    xlarge: 'h-24 w-auto',
    hero: 'h-32 w-auto'
  }

  // Text size variants to match logo sizes
  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm', 
    large: 'text-lg',
    xlarge: 'text-xl',
    hero: 'text-2xl'
  }

  // Drop shadow classes
  const shadowClasses = showDropShadow 
    ? 'drop-shadow-lg' 
    : ''

  // Color variant classes - using CSS filters to convert to black
  const variantClasses = variant === 'black' 
    ? 'brightness-0 saturate-100' // Converts any color to pure black
    : ''

  if (showText) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src="/icons/jg_logo.png"
          alt={alt}
          className={`${sizeClasses[size]} ${shadowClasses} ${variantClasses} mb-1`}
        />
        <div className={`${textSizeClasses[size]} font-bold text-gray-800 leading-none`}>
          {text}
        </div>
      </div>
    )
  }

  return (
    <img
      src="/icons/jg_logo.png"
      alt={alt}
      className={`${sizeClasses[size]} ${shadowClasses} ${variantClasses} ${className}`}
    />
  )
}

export default Logo
