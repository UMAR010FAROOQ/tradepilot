import AdminRequestPage from '../../components/admin/AdminRequestPage.jsx'
import { approveDeposit, getDeposits, rejectDeposit } from '../../services/adminService.js'

function Deposits() {
  return <AdminRequestPage approveRequest={approveDeposit} loadRequests={getDeposits} rejectRequest={rejectDeposit} type="deposit" />
}

export default Deposits
