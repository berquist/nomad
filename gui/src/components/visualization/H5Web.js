import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { appBase } from '../../config'
import { H5GroveProvider, App } from '@h5web/app'
import { useApi } from '../api'
import { useErrors } from '../errors'

import '@h5web/lib/dist/styles.css'
import '@h5web/app/dist/styles.css'
import './H5Web.css'

const H5Web = ({upload_id, filename, initialPath, explorerOpen}) => {
  const {api} = useApi()
  const {raiseError} = useErrors()
  const [filepath, setFilepath] = useState(false)

  useEffect(() => {
    if (filename && upload_id) {
      if (filename.includes('.yaml') || filename.includes('.yml')) {
        api.get(`/uploads/${upload_id}/raw/${filename}`)
          .then(data => {
            const fname = data.match(/output:[ \t]*(.*nxs)/i)?.[1]
            setFilepath(fname)
          })
          .catch(raiseError)
      } else {
        setFilepath(filename)
      }
    }
  }, [filepath, api, filename, upload_id, raiseError])

  if (filepath) {
    return (
      <H5GroveProvider
        url={appBase + '/h5grove/'}
        filepath={filepath}
        axiosConfig={{params: {file: filepath, upload_id: upload_id}, headers: {Authorization: "Bearer " + api?.keycloak?.token}}}
      >
        <App disableDarkMode initialPath={initialPath} explorerOpen={explorerOpen}/>

      </H5GroveProvider>
    )
  }
  return 'Loading...'
}
H5Web.propTypes = {
  upload_id: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
  initialPath: PropTypes.string.isRequired,
  explorerOpen: PropTypes.bool
}

export default H5Web
