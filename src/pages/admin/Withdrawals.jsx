import AdminRequestPage from '../../components/admin/AdminRequestPage.jsx'
import { approveWithdrawal, getWithdrawals, rejectWithdrawal } from '../../services/adminService.js'

function Withdrawals() {
  return <AdminRequestPage approveRequest={approveWithdrawal} loadRequests={getWithdrawals} rejectRequest={rejectWithdrawal} type="withdrawal" />
}

export default Withdrawals
