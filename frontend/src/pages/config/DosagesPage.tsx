import { dosagesApi } from '../../api/endpoints'
import { ConfigEntityPage } from './ConfigEntityPage'

export function DosagesPage() {
  return <ConfigEntityPage entityApi={dosagesApi} entityName="Dosage" entityNamePlural="Dosages" />
}
