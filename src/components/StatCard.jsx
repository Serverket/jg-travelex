import React from 'react'

const StatCard = ({ title, value, icon, change, changeType = 'increase', footer }) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600">
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {(change !== undefined || footer) && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            {change !== undefined ? (
              <span
                className={`font-medium ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}
              >
                {changeType === 'increase' ? (
                  <span className="inline-flex items-center">
                    <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">Increased by</span>
                    {change}
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <svg className="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">Decreased by</span>
                    {change}
                  </span>
                )}
              </span>
            ) : (
              <span className="font-medium text-gray-600">{footer}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatCard