'use client';

import { ReactNode } from 'react';

interface Step {
  id: string;
  title: string;
  description: string;
}

interface StepWizardProps {
  steps: Step[];
  currentStep: number;
  children: ReactNode;
}

export function StepWizard({ steps, currentStep, children }: StepWizardProps) {
  return (
    <div className="space-y-8">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  index < currentStep
                    ? 'bg-green-600 text-white'
                    : index === currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {index < currentStep ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    index <= currentStep ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  index < currentStep ? 'bg-green-600' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        {children}
      </div>
    </div>
  );
}

interface StepActionsProps {
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
  loading?: boolean;
}

export function StepActions({
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Continue',
  backLabel = 'Back',
  skipLabel = 'Skip',
  nextDisabled = false,
  showBack = true,
  showSkip = false,
  loading = false,
}: StepActionsProps) {
  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-800">
      <div>
        {showBack && onBack && (
          <button
            onClick={onBack}
            disabled={loading}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {backLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            disabled={loading}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {skipLabel}
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
