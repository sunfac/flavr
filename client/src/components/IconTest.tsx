import React from 'react';
import { iconMap } from '@/lib/iconMap';

export function IconTest() {
  try {
    return (
      <div className="p-4">
        <h2>Icon Test</h2>
        <div className="flex gap-2">
          {React.createElement(iconMap.heart, { className: "w-6 h-6 text-red-500" })}
          {React.createElement(iconMap.chefHat, { className: "w-6 h-6 text-blue-500" })}
          {React.createElement(iconMap.clock, { className: "w-6 h-6 text-green-500" })}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 bg-red-100 text-red-800">
        Icon Error: {error.message}
      </div>
    );
  }
}