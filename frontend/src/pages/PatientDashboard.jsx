import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Activity, CalendarPlus, List, Clock, AlertCircle, User, PhoneCall, CheckCircle } from 'lucide-react';

export default function PatientDashboard() {
    const { user, api, logout } = useContext(AuthContext);
    
    // Tab & Data States
    const [activeTab, setActiveTab] = useState('profile'); 
    const [appointments, setAppointments] = useState([]);
    const [myQueue, setMyQueue] = useState([]); // <-- NEW: State to hold live ML wait times
    const [doctors, setDoctors] = useState([]);
    const [patientProfile, setPatientProfile] = useState(null);
    
    // Form States
    const [disease, setDisease] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);
    const [bookingType, setBookingType] = useState('now'); 
    const [scheduledTime, setScheduledTime] = useState('');
    const [message, setMessage] = useState('');
    
    // Interactive Modal States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [activeCall, setActiveCall] = useState(null); 

    // 1. Fetch Initial Data
    useEffect(() => {
        fetchAppointments();
        fetchDoctors();
        setPatientProfile({
            name: user?.name || "Patient Profile",
            email: user?.email,
            phone: "+1 234 567 890",
            gender: "male",
            birth_date: "1990-05-15",
            address: "123 Main St, City"
        });
    }, [user]);

    const fetchAppointments = async () => {
        try {
            // UPDATED: Fetch both appointments AND live queue data simultaneously
            const [apptRes, queueRes] = await Promise.all([
                api.get('/patient/my-appointments'),
                api.get('/patient/my-queue').catch(() => ({ data: [] }))
            ]);
            setAppointments(apptRes.data);
            setMyQueue(queueRes.data); // Store ML predictions
        } catch (err) { console.error("Could not fetch data", err); }
    };

    const fetchDoctors = async () => {
        try {
            const res = await api.get('/patient/doctors');
            setDoctors(res.data);
        } catch (err) { console.error("Could not fetch doctors"); }
    };

    const getDoctorName = (doctorId) => {
        const doc = doctors.find(d => d.id === doctorId);
        return doc ? `Dr. ${doc.name}` : `Doctor ID: ${doctorId}`;
    };

    const calculateAge = (dob) => {
        if (!dob) return 0;
        const diff = Date.now() - new Date(dob).getTime();
        return Math.abs(new Date(diff).getUTCFullYear() - 1970);
    };

    const activeAppt = appointments.find(app => app.status === 'approved');
    const activeDoctorId = activeAppt?.doctor_id;
    const activeApptId = activeAppt?.id;
    const activeDisease = activeAppt?.disease;

    // 2. WebSocket Connection
    useEffect(() => {
        let ws;
        
        if (activeDoctorId) {
            ws = new WebSocket(`ws://127.0.0.1:8000/ws/queue/${activeDoctorId}`);
            ws.onopen = () => console.log("Connected to Live Queue");
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.action === 'patient_called' && data.appointment_id === activeApptId) {
                    setActiveCall({ 
                        doctorName: `Doctor ID: ${activeDoctorId}`, 
                        disease: activeDisease 
                    });
                }
                
                // Triggers fetchAppointments which now also grabs the fresh ML wait times!
                fetchAppointments(); 
            };
        }
        return () => { if (ws) ws.close(); };
    }, [activeDoctorId, activeApptId, activeDisease]); 

    // 3. Handle Booking Submission
    const handleBooking = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const endpoint = isEmergency ? '/patient/emergency-appointment' : '/patient/appointments';
            await api.post(endpoint, {
                doctor_id: parseInt(selectedDoctor),
                disease: disease,
                is_emergency: isEmergency,
                scheduled_time: bookingType === 'future' ? new Date(scheduledTime).toISOString() : null
            });
            setMessage(isEmergency ? 'Emergency bypass activated!' : 'Appointment requested! Wait for admin approval.');
            setDisease('');
            setScheduledTime('');
            fetchAppointments();
        } catch (err) { setMessage('Error booking appointment.'); }
    };

    const pendingAppointments = appointments.filter(a => a.status === 'pending');
    const approvedAppointments = appointments.filter(a => a.status === 'approved');
    const pastAppointments = appointments.filter(a => a.status === 'completed');

    return (
        <div className="min-h-screen bg-slate-50 relative">
            
            {activeCall && (
                <div className="fixed inset-0 bg-primary/95 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center transform animate-bounce">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <PhoneCall className="w-12 h-12 animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">It's Your Turn!</h2>
                        <p className="text-xl text-slate-600 mb-6">
                            <strong className="text-primary">{getDoctorName(activeDoctorId)}</strong> is calling you to the room for your appointment regarding: <br/>
                            <span className="italic text-slate-800 mt-2 block">"{activeCall.disease}"</span>
                        </p>
                        <button 
                            onClick={() => setActiveCall(null)} 
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <CheckCircle className="w-6 h-6" /> Accept & Join Session
                        </button>
                    </div>
                </div>
            )}

            <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Activity className="text-primary w-6 h-6" />
                    <h1 className="text-xl font-bold text-slate-800">SmartQ Patient</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={logout} className="text-sm text-red-600 hover:text-red-700 font-medium">Log out</button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto mt-8 px-4 flex gap-8">
                <aside className="w-64 shrink-0 space-y-2">
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <User className="w-5 h-5" /> My Profile
                    </button>
                    <button onClick={() => setActiveTab('book')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'book' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <CalendarPlus className="w-5 h-5" /> Book Appointment
                    </button>
                    <button onClick={() => setActiveTab('queue')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'queue' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Clock className="w-5 h-5" /> Current Queue
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'history' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <List className="w-5 h-5" /> History
                    </button>
                    <button onClick={() => setActiveTab('emergency')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'emergency' ? 'bg-red-500 text-white' : 'text-red-600 hover:bg-red-50'}`}>
                        <AlertCircle className="w-5 h-5" /> Emergency Bypass
                    </button>
                </aside>

                <section className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    
                    {activeTab === 'profile' && patientProfile && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Patient Profile</h2>
                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <div><p className="text-sm text-slate-500">Full Name</p><p className="font-medium">{patientProfile.name}</p></div>
                                <div><p className="text-sm text-slate-500">Email</p><p className="font-medium">{patientProfile.email}</p></div>
                                <div><p className="text-sm text-slate-500">Phone</p><p className="font-medium">{patientProfile.phone}</p></div>
                                <div><p className="text-sm text-slate-500">Gender</p><p className="font-medium capitalize">{patientProfile.gender}</p></div>
                                <div><p className="text-sm text-slate-500">Birth Date</p><p className="font-medium">{patientProfile.birth_date}</p></div>
                                <div>
                                    <p className="text-sm text-slate-500">Age</p>
                                    <p className="font-medium text-primary">{calculateAge(patientProfile.birth_date)} years old</p>
                                </div>
                                <div className="col-span-2"><p className="text-sm text-slate-500">Address</p><p className="font-medium">{patientProfile.address}</p></div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2 rounded-lg font-medium transition-colors">
                                    {isEditingProfile ? 'Cancel Edit' : 'Edit Information'}
                                </button>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'book' || activeTab === 'emergency') && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">
                                {activeTab === 'emergency' ? 'Declare Emergency' : 'Book New Appointment'}
                            </h2>
                            {message && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg">{message}</div>}
                            
                            <form onSubmit={(e) => { setIsEmergency(activeTab === 'emergency'); handleBooking(e); }} className="space-y-4 max-w-lg">
                                
                                {activeTab === 'book' && (
                                    <div className="flex gap-4 mb-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="timing" checked={bookingType === 'now'} onChange={() => setBookingType('now')} className="w-4 h-4 text-primary" />
                                            <span className="font-medium text-slate-700">Right Now (Queue)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="timing" checked={bookingType === 'future'} onChange={() => setBookingType('future')} className="w-4 h-4 text-primary" />
                                            <span className="font-medium text-slate-700">Future Date & Time</span>
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Doctor</label>
                                    <select required value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none">
                                        <option value="">-- Choose a Doctor --</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>Dr. {doc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {bookingType === 'future' && activeTab === 'book' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Date & Time</label>
                                        <input type="datetime-local" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Symptoms / Disease</label>
                                    <textarea required value={disease} onChange={(e) => setDisease(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" rows="3" placeholder="Describe your issue..."></textarea>
                                </div>

                                <button type="submit" className={`w-full py-3 rounded-lg text-white font-bold ${activeTab === 'emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-blue-700'}`}>
                                    {activeTab === 'emergency' ? 'Bypass Queue Now' : 'Submit Appointment'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'queue' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Current Appointments</h2>
                            
                            <h3 className="font-bold text-slate-800 mt-2 mb-4">Active in Queue (Approved)</h3>
                            {approvedAppointments.length > 0 ? (
                                approvedAppointments.map(app => {
                                    // THE FIX: Find this specific appointment in the queue to get the ML wait time
                                    const queueData = myQueue.find(q => q.appointment_id === app.id);
                                    const waitTime = queueData ? queueData.estimated_wait_time_mins : '...';
                                    
                                    return (
                                        <div key={app.id} className="p-6 border-2 border-primary/20 bg-primary/5 rounded-xl flex items-center justify-between mb-4 shadow-sm">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">{getDoctorName(app.doctor_id)}</h3>
                                                <p className="text-slate-600 text-sm">Reason: {app.disease}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-primary mb-1">Estimated Wait</div>
                                                <div className="text-2xl font-black text-slate-800">~{waitTime} mins</div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-slate-500 text-sm mb-6">No active queue positions.</p>
                            )}

                            <h3 className="font-bold text-slate-800 mt-8 mb-4">Future & Pending</h3>
                            <div className="space-y-3">
                                {pendingAppointments.map(app => (
                                    <div key={app.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50">
                                        <div>
                                            <p className="font-medium text-slate-800">{getDoctorName(app.doctor_id)}</p>
                                            <p className="text-sm text-slate-500">{app.disease}</p>
                                            {app.scheduled_time && <p className="text-xs text-primary mt-1">Scheduled for: {new Date(app.scheduled_time).toLocaleString()}</p>}
                                        </div>
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">PENDING ADMIN</span>
                                    </div>
                                ))}
                                {pendingAppointments.length === 0 && <p className="text-sm text-slate-400">No pending or future requests.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Appointment History</h2>
                            <div className="space-y-3">
                                {pastAppointments.map(app => (
                                    <div key={app.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-100 opacity-80">
                                        <div>
                                            <p className="font-medium text-slate-800">{getDoctorName(app.doctor_id)}</p>
                                            <p className="text-sm text-slate-500">{app.disease}</p>
                                        </div>
                                        <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full">COMPLETED</span>
                                    </div>
                                ))}
                                {pastAppointments.length === 0 && <p className="text-sm text-slate-400">No past appointments found.</p>}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}