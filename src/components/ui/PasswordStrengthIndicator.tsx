import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  className = '' 
}) => {
  const getStrength = (pwd: string) => {
    if (pwd.length < 6) return { score: 0, label: 'Too short' };
    if (pwd.length < 8) return { score: 1, label: 'Weak' };
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { score: 3, label: 'Strong' };
    }
    return { score: 2, label: 'Medium' };
  };

  const strength = getStrength(password);
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex space-x-1 mb-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded ${
              index <= strength.score ? colors[strength.score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-gray-600">{strength.label}</p>
    </div>
  );
};

export default PasswordStrengthIndicator;