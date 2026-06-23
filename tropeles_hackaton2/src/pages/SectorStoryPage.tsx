import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SectorStory from '../components/SectorStory'

export function SectorStoryPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()

  return (
    <SectorStory
      sectorId={id ?? ''}
      authToken={token}
      onBack={() => navigate('/sectors')}
    />
  )
}