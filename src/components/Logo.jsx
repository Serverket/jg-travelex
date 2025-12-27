import React from 'react'

const Logo = ({ 
  size = 'medium', 
  className = '', 
  showDropShadow = false,
  variant = 'black', // 'black', 'white' or 'original'
  showText = false, // Show text under logo
  text = 'JGEx',
  alt = 'JG Travelex Logo'
}) => {
  // Size variants for different use cases
  const sizeClasses = {
    small: 'h-5 w-auto md:h-6',
    medium: 'h-6 w-auto md:h-8 lg:h-9', 
    large: 'h-12 w-auto md:h-14 lg:h-16',
    xlarge: 'h-16 w-auto md:h-20 lg:h-24',
    hero: 'h-20 w-auto md:h-28 lg:h-32'
  }

  // Text size variants to match logo sizes
  const textSizeClasses = {
    small: 'text-[0.65rem] md:text-xs',
    medium: 'text-sm md:text-base', 
    large: 'text-lg md:text-xl lg:text-2xl',
    xlarge: 'text-xl md:text-2xl lg:text-3xl',
    hero: 'text-2xl md:text-3xl lg:text-4xl'
  }

  // Drop shadow classes
  const shadowClasses = showDropShadow 
    ? 'drop-shadow-lg' 
    : ''

  // Color variant classes - using CSS filters to convert to black
  const variantClasses = variant === 'black' 
    ? 'brightness-0 saturate-100' // Converts any color to pure black
    : ''

  const textColorClasses = variant === 'white'
    ? 'text-white'
    : 'text-gray-800'

  if (showText) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src="/icons/jg_logo.png"
          alt={alt}
          className={`${sizeClasses[size]} ${shadowClasses} ${variantClasses} mb-1`}
        />
  <div className={`${textSizeClasses[size]} font-bold ${textColorClasses} leading-none`}>
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
