import React from 'react'

type StepperProps = {
  steps: string[]
  current: number
}

export default function CheckoutStepper({ steps, current }: StepperProps) {
  return (
    <div className="w-full mb-4">
      <div className="hidden sm:flex items-center justify-between gap-4">
        {steps.map((label, i) => {
          const active = i === current
          const done = i < current
          return (
            <div key={label} className="flex-1 min-w-0">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-500 text-white scale-105 shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  {done ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <span className="text-sm font-medium">{i + 1}</span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 transition-colors duration-300 ${done ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                )}
                <div className="sr-only">Step {i + 1}: {label}</div>
              </div>
              <div className="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">{label}</div>
            </div>
          )
        })}
      </div>

      {/* Mobile compact stepper */}
      <div className="sm:hidden flex items-center justify-between gap-2">
        {steps.map((label, i) => {
          const active = i === current
          const done = i < current
          return (
            <div key={label} className={`flex-1 h-2 rounded ${done ? 'bg-blue-500' : active ? 'bg-blue-400' : 'bg-gray-200 dark:bg-gray-600'}`} title={label} />
          )
        })}
      </div>
    </div>
  )
}
