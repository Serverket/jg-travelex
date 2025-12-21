import { Link } from 'react-router-dom'

const AccessDenied = ({ feature }) => {
  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow rounded-lg p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-800 mb-3">Acceso Restringido</h1>
      <p className="text-gray-600 mb-6">
        {feature
          ? `No tienes permisos para acceder a la sección "${feature}". Si crees que se trata de un error, contacta al administrador.`
          : 'No tienes permisos suficientes para ver esta sección.'}
      </p>
      <Link
        to="/dashboard"
        className="inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
      >
        Volver al inicio
      </Link>
    </div>
  )
}

export default AccessDenied
