import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, CheckSquare, Users, UserPlus, Stethoscope, Activity, Trash2, Edit, Save, X, Clock, Calendar } from 'lucide-react';

export default function AdminDashboard() {
    const { user, api, logout } = useContext(AuthContext);
    
    // Tab States
    const [activeTab, setActiveTab] = useState('approvals');
    const [doctorSubTab, setDoctorSubTab] = useState('list'); // 'list' or 'register'
    
    // Data States
    const [pendingAppointments, setPendingAppointments] = useState([]);
    const [allAppointments, setAllAppointments] = useState([]); // Needed for patient history
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    
    // Form & UI States
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    
    const defaultDoctorState = {
        name: '', email: '', phone: '', gender: 'other', 
        birth_date: '1980-01-01', address: 'Hospital Staff', 
        password: '', specialization: '', room_number: ''
    };
    const [newDoctor, setNewDoctor] = useState(defaultDoctorState);

    // Fetch data on load
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [apptRes, docsRes, patsRes, allApptRes] = await Promise.all([
                api.get('/admin/pending-appointments'),
                api.get('/admin/doctors'),
                api.get('/admin/patients'),
                api.get('/admin/all-appointments').catch(() => ({ data: [] })) // Graceful fallback
            ]);
            setPendingAppointments(apptRes.data);
            setDoctors(docsRes.data);
            setPatients(patsRes.data);
            setAllAppointments(allApptRes.data);
        } catch (err) {
            console.error("Failed to fetch admin data", err);
        }
    };

    // --- Actions ---

    const handleApprove = async (appointmentId) => {
        try {
            await api.post(`/admin/approve-appointment/${appointmentId}`);
            setMessage('Appointment approved and added to live queue!');
            fetchData(); 
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Error approving appointment.');
        }
    };

    const handleRegisterDoctor = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            await api.post('/admin/register-doctor', newDoctor);
            setMessage(`Successfully registered Dr. ${newDoctor.name}!`);
            setNewDoctor(defaultDoctorState); 
            setDoctorSubTab('list');
            fetchData(); 
        } catch (err) {
            let errorMsg = 'Failed to register doctor.';
            const detail = err.response?.data?.detail;
            if (detail) {
                if (Array.isArray(detail)) errorMsg = detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
                else if (typeof detail === 'string') errorMsg = detail;
            }
            setMessage(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDoctor = async (id, name) => {
        if (!window.confirm(`Are you sure you want to permanently remove Dr. ${name}?`)) return;
        try {
            await api.delete(`/admin/doctor/${id}`);
            setMessage(`Dr. ${name} has been removed.`);
            fetchData();
        } catch (err) {
            setMessage("Failed to delete doctor.");
        }
    };

    const handleUpdateDoctor = async () => {
        try {
            await api.put(`/admin/doctor/${editingDoctor.id}`, editingDoctor);
            setMessage(`Dr. ${editingDoctor.name} updated successfully.`);
            setEditingDoctor(null);
            fetchData();
        } catch (err) {
            setMessage("Failed to update doctor.");
        }
    };

    const handleDoctorChange = (e) => setNewDoctor({ ...newDoctor, [e.target.name]: e.target.value });

    // Helpers
    const getPatient = (id) => patients.find(p => p.id === id) || { name: 'Unknown', email: 'N/A', phone: 'N/A' };
    const getDoctorName = (id) => doctors.find(d => d.id === id)?.name || `ID #${id}`;

    // Format the time based on whether it is a future scheduled appointment or an immediate walk-in
    const formatAppointmentTime = (app) => {
        if (app.scheduled_time) {
            return (
                <span className="flex items-center gap-1 text-primary font-bold">
                    <Calendar className="w-4 h-4" /> {new Date(app.scheduled_time).toLocaleString()}
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-slate-600">
                <Clock className="w-4 h-4" /> Immediate Request
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <header className="bg-slate-800 shadow-md border-b border-slate-700 px-6 py-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Shield className="text-emerald-400 w-6 h-6" />
                    <h1 className="text-xl font-bold">SmartQ Administrator</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-300 font-medium">{user?.email}</span>
                    <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 font-bold transition-colors">Log out</button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto mt-8 px-4 flex gap-8">
                {/* Sidebar Navigation */}
                <aside className="w-64 shrink-0 space-y-2">
                    <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'approvals' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <CheckSquare className="w-5 h-5" /> Pending Approvals
                        {pendingAppointments.length > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingAppointments.length}</span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('doctors')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'doctors' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <Stethoscope className="w-5 h-5" /> Manage Doctors
                    </button>
                    <button onClick={() => setActiveTab('patients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'patients' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <Users className="w-5 h-5" /> Patient Directory
                    </button>
                </aside>

                {/* Main Content Area */}
                <section className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
                    
                    {message && (
                        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium flex items-center gap-2">
                            <Activity className="w-5 h-5" /> {message}
                        </div>
                    )}

                    {/* 1. APPROVALS TAB */}
                    {activeTab === 'approvals' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Pending Appointments</h2>
                            
                            {pendingAppointments.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">All caught up! No pending requests.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingAppointments.map(app => {
                                        const patient = getPatient(app.patient_id);
                                        return (
                                            <div key={app.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
                                                <div className="grid grid-cols-3 gap-6 w-full pr-8">
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-lg">{patient.name}</p>
                                                        <p className="text-sm text-slate-500">{patient.email} • {patient.phone}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 mb-1">Appointment Timing</p>
                                                        {formatAppointmentTime(app)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 mb-1">Requested Doctor & Issue</p>
                                                        <p className="text-slate-800">Dr. {getDoctorName(app.doctor_id)}</p>
                                                        <p className="text-sm text-slate-500 truncate">Reason: {app.disease}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleApprove(app.id)}
                                                    className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. DOCTORS TAB */}
                    {activeTab === 'doctors' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Doctor Management</h2>
                                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                                    <button onClick={() => setDoctorSubTab('list')} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${doctorSubTab === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Staff Directory</button>
                                    <button onClick={() => setDoctorSubTab('register')} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${doctorSubTab === 'register' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Hire New Doctor</button>
                                </div>
                            </div>
                            
                            {/* SubTab: Registration */}
                            {doctorSubTab === 'register' && (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-primary" /> Enter New Doctor Details
                                    </h3>
                                    <form onSubmit={handleRegisterDoctor} className="grid grid-cols-2 gap-4">
                                        <div><label className="text-sm font-medium mb-1 block">Full Name</label><input required type="text" name="name" value={newDoctor.name} onChange={handleDoctorChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"/></div>
                                        <div><label className="text-sm font-medium mb-1 block">Email</label><input required type="email" name="email" value={newDoctor.email} onChange={handleDoctorChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"/></div>
                                        <div><label className="text-sm font-medium mb-1 block">Specialization</label><input required type="text" name="specialization" value={newDoctor.specialization} onChange={handleDoctorChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"/></div>
                                        <div><label className="text-sm font-medium mb-1 block">Room Number</label><input required type="text" name="room_number" value={newDoctor.room_number} onChange={handleDoctorChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"/></div>
                                        <div><label className="text-sm font-medium mb-1 block">Phone</label><input required type="text" name="phone" value={newDoctor.phone} onChange={handleDoctorChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"/></div>
                                        <div><label className="text-sm font-medium mb-1 block">Password</label><input required type="password" name="password" value={newDoctor.password} onChange={handleDoctorChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-primary outline-none"/></div>
                                        
                                        <div className="col-span-2 mt-4">
                                            <button type="submit" disabled={isLoading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-70">
                                                {isLoading ? 'Registering...' : 'Complete Registration'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* SubTab: Directory List */}
                            {doctorSubTab === 'list' && (
                                <div className="grid grid-cols-1 gap-4">
                                    {doctors.length === 0 && <p className="text-slate-500">No doctors found.</p>}
                                    {doctors.map(doc => (
                                        <div key={doc.id} className="p-5 border border-slate-200 bg-white rounded-xl flex items-center justify-between shadow-sm">
                                            
                                            {/* Edit Mode vs View Mode */}
                                            {editingDoctor?.id === doc.id ? (
                                                <div className="flex-1 grid grid-cols-3 gap-4 mr-4">
                                                    <input type="text" value={editingDoctor.name} onChange={(e)=>setEditingDoctor({...editingDoctor, name: e.target.value})} className="p-2 border rounded text-sm"/>
                                                    <input type="email" value={editingDoctor.email} onChange={(e)=>setEditingDoctor({...editingDoctor, email: e.target.value})} className="p-2 border rounded text-sm"/>
                                                    <input type="text" value={editingDoctor.phone} onChange={(e)=>setEditingDoctor({...editingDoctor, phone: e.target.value})} className="p-2 border rounded text-sm"/>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black text-xl">
                                                        {doc.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-lg">Dr. {doc.name}</p>
                                                        <p className="text-sm text-slate-500">{doc.email} • {doc.phone}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 shrink-0">
                                                {editingDoctor?.id === doc.id ? (
                                                    <>
                                                        <button onClick={handleUpdateDoctor} className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg"><Save className="w-5 h-5"/></button>
                                                        <button onClick={() => setEditingDoctor(null)} className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setEditingDoctor(doc)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Edit className="w-5 h-5"/></button>
                                                        <button onClick={() => handleDeleteDoctor(doc.id, doc.name)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. PATIENTS TAB */}
                    {activeTab === 'patients' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Patient Directory & History</h2>
                            <div className="space-y-6">
                                {patients.map(patient => {
                                    // Find all appointments for this specific patient
                                    const history = allAppointments.filter(a => a.patient_id === patient.id);
                                    
                                    return (
                                        <div key={patient.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            {/* Patient Header */}
                                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg">{patient.name} <span className="text-sm font-normal text-slate-500 ml-2">ID #{patient.id}</span></h3>
                                                    <p className="text-sm text-slate-600">{patient.email} • {patient.phone}</p>
                                                </div>
                                                <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-primary border border-primary/20">
                                                    {history.length} Total Visits
                                                </span>
                                            </div>
                                            
                                            {/* Patient Appointment History */}
                                            <div className="p-6 bg-white">
                                                {history.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic">No appointment history found.</p>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {history.map(app => (
                                                            <div key={app.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                <Clock className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800">Dr. {getDoctorName(app.doctor_id)}</p>
                                                                    <p className="text-xs text-slate-500">{app.disease}</p>
                                                                    <p className="text-xs text-primary font-medium mt-1">
                                                                        {app.scheduled_time ? new Date(app.scheduled_time).toLocaleString() : 'Walk-in'}
                                                                    </p>
                                                                    <span className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${app.status === 'completed' ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                                                                        {app.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}