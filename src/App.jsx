import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc,
    Timestamp,
    query,
    deleteDoc,
    setDoc
} from 'firebase/firestore';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';

// --- Helper Functions ---
const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-CA'); // YYYY-MM-DD format
};

// --- STYLES OBJECT ---
const styles = {
    // Layouts & Containers
    pageContainer: { 
        backgroundColor: '#eef2f7', 
        minHeight: '100vh', 
        fontFamily: 'sans-serif',
        backgroundImage: `url('https://as2.ftcdn.net/v2/jpg/01/31/15/51/1000_F_131155172_4ZVdaT7YF5yJHqircjy59DDxV6aWFds9.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
    },
    appContainer: { maxWidth: '896px', margin: '0 auto', padding: '2rem 1rem' },
    authContainer: { 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#f7fafc',
        backgroundImage: `url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    },
    authBox: { width: '100%', maxWidth: '448px', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    header: { backgroundColor: '#ebf8ff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' },
    modalContent: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' },
    
    // Typography
    authTitle: { fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', color: '#2d3748', marginBottom: '0.5rem' },
    appLoginSubtitle: { fontSize: '1.1rem', fontWeight: '600', textAlign: 'center', color: '#4a5568', marginBottom: '1.5rem', marginTop: '-0.5rem' },
    authSubtitle: { textAlign: 'center', color: '#718096', marginBottom: '1.5rem' },
    headerTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' },
    headerSubtitle: { fontSize: '0.875rem', color: '#4a5568' },
    modalTitle: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' },
    label: { display: 'block', color: '#4a5568', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' },
    sectionTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' },
    
    // Form Elements & Buttons
    input: { boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#4a5568', boxSizing: 'border-box' },
    button: { borderRadius: '0.25rem', fontWeight: 'bold', padding: '0.5rem 1rem', transition: 'background-color 0.2s', border: 'none', cursor: 'pointer' },
    buttonPrimary: { backgroundColor: '#4299e1', color: 'white' },
    buttonSecondary: { backgroundColor: '#e2e8f0', color: '#2d3748' },
    buttonDanger: { backgroundColor: '#e53e3e', color: 'white' },
    link: { color: '#4299e1', fontWeight: 'bold', textDecoration: 'none' },

    // Images & Logos
    logo: { width: '80px', height: '80px', marginBottom: '1rem', borderRadius: '50%' },
    headerLogo: { width: '40px', height: '40px', marginRight: '1rem', borderRadius: '50%' },

    // License List
    licenseListContainer: { backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '0.5rem' },
    licenseItem: { padding: '1rem', borderBottom: '1px solid #edf2f7', transition: 'background-color 0.2s' },
    licenseItemHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    licenseItemTitle: { fontWeight: '600', fontSize: '1.125rem', color: '#2d3748' },
    licenseDetailsGrid: { marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.25rem 1rem', fontSize: '0.875rem', color: '#4a5568' },
    
    // Flash Messages
    flashMessage: { padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid', marginBottom: '1rem' },
    flashError: { backgroundColor: '#fed7d7', borderColor: '#e53e3e', color: '#c53030' },
    flashWarning: { backgroundColor: '#feebc8', borderColor: '#dd6b20', color: '#9c4221' },
    
    // Dashboard
    dashboardContainer: { backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem' },
    welcomeImageLink: { display: 'block', marginBottom: '1.5rem' },
    welcomeImage: { width: '100%', height: '200px', objectFit: 'cover', borderRadius: '0.5rem' },
    quickLinksContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
    quickLinkCard: { display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', backgroundColor: '#f7fafc' },
    quickLinkImage: { width: '100%', height: '100px', objectFit: 'cover' },
    quickLinkTitle: { fontWeight: '600', padding: '0.75rem' },
    
    // Navigation
    navContainer: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
    navButton: { flex: 1, padding: '0.75rem', fontWeight: 'bold', borderRadius: '0.5rem', borderWidth: '1px', borderStyle: 'solid', borderColor: '#e2e8f0', cursor: 'pointer', minWidth: '120px' },
    navButtonActive: { backgroundColor: '#4299e1', color: 'white', borderColor: '#4299e1' },
    navButtonInactive: { backgroundColor: 'white', color: '#4a5568' },
    
    // Attendance & Reporting
    card: { backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '0.5rem', padding: '1.5rem' },
    gridContainer: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #edf2f7' },
    statusButton: { fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', minWidth: '60px', textAlign: 'center' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { border: '1px solid #e2e8f0', padding: '0.5rem', textAlign: 'left', backgroundColor: '#f7fafc', fontWeight: '600' },
    td: { border: '1px solid #e2e8f0', padding: '0.5rem', textAlign: 'center' },
};


// --- Authentication Component ---
const AuthPage = ({ onSignIn, onSignUp, onPasswordReset }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [regCode, setRegCode] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    const SECRET_REGISTRATION_CODE = 'SGRD1469';
    const logoUrl = 'https://www.sgrduhs.in/temp/html2/image/big-logo.png';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setMessage('');
        try {
            if (isSignUp) {
                if (regCode !== SECRET_REGISTRATION_CODE) {
                    setError('Invalid Registration Code. Please contact an administrator.');
                    return;
                }
                await onSignUp(email, password);
            } else {
                await onSignIn(email, password);
            }
        } catch (err) { setError(err.message); }
    };
    
    const handlePasswordResetClick = async () => {
        if (!email) { setError("Please enter your email address to reset your password."); return; }
        setError(''); setMessage('');
        try {
            await onPasswordReset(email);
            setMessage("Password reset email sent! Please check your inbox.");
        } catch (err) { setError(err.message); }
    };

    return (
        <div style={styles.authContainer}>
            <div style={styles.authBox}>
                <img src={logoUrl} alt="Logo" style={styles.logo} />
                <h1 style={styles.authTitle}>SRI GURU RAM DAS PHARMACY</h1>
                <p style={{...styles.authSubtitle}}>{isSignUp ? 'Create a new account' : 'Sign in to your account'}</p>
                <form onSubmit={handleSubmit} style={{width: '100%'}}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={styles.label} htmlFor="email">Email</label>
                        <input style={styles.input} id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={styles.label} htmlFor="password">Password</label>
                        <input style={styles.input} id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    {isSignUp && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={styles.label} htmlFor="regCode">Registration Code</label>
                            <input style={styles.input} id="regCode" type="password" value={regCode} onChange={(e) => setRegCode(e.target.value)} required />
                        </div>
                    )}
                    {error && <p style={{ color: '#e53e3e', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
                    {message && <p style={{ color: '#38a169', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem' }}>{message}</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button style={{...styles.button, ...styles.buttonPrimary, width: '100%'}} type="submit">{isSignUp ? 'Sign Up' : 'Sign In'}</button>
                        <button style={{...styles.button, ...styles.buttonSecondary, width: '100%'}} type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}>{isSignUp ? 'Have an account? Sign In' : 'Need an account? Sign Up'}</button>
                        <button style={{...styles.link, background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem'}} type="button" onClick={handlePasswordResetClick}>Forgot Password?</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main App Components ---

const Header = ({ onSignOut }) => {
    const logoUrl = 'https://www.sgrduhs.in/temp/html2/image/big-logo.png';

    return (
        <header style={styles.header}>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <img src={logoUrl} alt="Logo" style={styles.headerLogo} />
                <div>
                    <h1 style={styles.headerTitle}>SRI GURU RAM DAS PHARMACY</h1>
                    <p style={styles.headerSubtitle}>inside Sri Guru Ram Das Hospital, Vallah, Amritsar</p>
                </div>
            </div>
            <button style={{...styles.button, ...styles.buttonDanger}} onClick={onSignOut}>Sign Out</button>
        </header>
    );
};

const Dashboard = () => {
    const mainImageUrl = 'http://www.sgrduhs.in/tiny_editor_imgs/Hospital5.JPG';
    const mainImageLink = 'https://www.sgrduhs.in/web-overview-Hospital.html';

    const quickLinks = [
        { title: 'Official SGRDUHS Website', imageUrl: 'https://www.sgrduhs.in/pagres/profile-1.jpg', link: 'https://www.sgrduhs.in/' },
        { title: 'Sri Darbar Sahib Hukamnama', imageUrl: 'https://t4.ftcdn.net/jpg/05/40/61/97/240_F_540619734_40S5GPhDxTx5uunsuQF4aiZLWkHz3udb.jpg', link: 'https://hs.sgpc.net/' },
        { title: 'Notice and News', imageUrl: 'https://www.sgrduhs.in/newsres/1752565936-1.jpg', link: 'https://www.sgrduhs.in/newses.html' },
    ];

    return (
        <div style={styles.dashboardContainer}>
            <a href={mainImageLink} target="_blank" rel="noopener noreferrer" style={styles.welcomeImageLink}><img src={mainImageUrl} alt="Welcome" style={styles.welcomeImage} /></a>
            <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem'}}>Quick Links</h2>
            <div style={styles.quickLinksContainer}>
                {quickLinks.map((item, index) => (
                    <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" style={styles.quickLinkCard}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <img src={item.imageUrl} alt={item.title} style={styles.quickLinkImage} />
                        <p style={styles.quickLinkTitle}>{item.title}</p>
                    </a>
                ))}
            </div>
        </div>
    );
};

// --- License Tracker Components ---
const FlashMessage = ({ licenses }) => {
    const now = new Date();
    const expiringSoon = licenses.filter(l => l.expiryDate && (l.expiryDate.toDate() - now > 0) && (l.expiryDate.toDate() - now <= thirtyDaysInMs));
    const expired = licenses.filter(l => l.expiryDate && l.expiryDate.toDate() < now);

    if (expiringSoon.length === 0 && expired.length === 0) return null;

    return (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {expired.map(license => (
                <div key={license.id} style={{...styles.flashMessage, ...styles.flashError}}>
                    <p style={{ fontWeight: 'bold' }}>License Expired!</p>
                    <p>"{license.name}" expired on {formatDate(license.expiryDate)}. Please renew it immediately.</p>
                </div>
            ))}
            {expiringSoon.map(license => (
                <div key={license.id} style={{...styles.flashMessage, ...styles.flashWarning}}>
                    <p style={{ fontWeight: 'bold' }}>License Expiring Soon!</p>
                    <p>"{license.name}" will expire on {formatDate(license.expiryDate)}. Don't forget to renew.</p>
                </div>
            ))}
        </div>
    );
};

const LicenseFormModal = ({ onSave, onCancel, licenseToEdit, storage, userId }) => {
    const [name, setName] = useState(licenseToEdit ? licenseToEdit.name : '');
    const [expiryDate, setExpiryDate] = useState(licenseToEdit ? formatDate(licenseToEdit.expiryDate) : '');
    const [licenseNumber, setLicenseNumber] = useState(licenseToEdit ? licenseToEdit.licenseNumber : '');
    const [issuingAuthority, setIssuingAuthority] = useState(licenseToEdit ? licenseToEdit.issuingAuthority : '');
    const [notes, setNotes] = useState(licenseToEdit ? licenseToEdit.notes : '');
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !expiryDate) { setError('License Name and Expiry Date are required.'); return; }
        const newExpiryDate = new Date(expiryDate);
        if (isNaN(newExpiryDate.getTime())) { setError('Invalid date format.'); return; }
        
        setIsUploading(true);
        setError('');

        let fileURL = licenseToEdit?.fileURL || '';
        let fileName = licenseToEdit?.fileName || '';

        if (file) {
            const storageRef = ref(storage, `licenses/${userId}/${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                fileURL = await getDownloadURL(snapshot.ref);
                fileName = file.name;
            } catch (uploadError) {
                setError("Failed to upload file. Please try again.");
                setIsUploading(false);
                return;
            }
        }
        
        const licenseData = { name, expiryDate: Timestamp.fromDate(newExpiryDate), licenseNumber: licenseNumber || '', issuingAuthority: issuingAuthority || '', notes: notes || '', fileURL, fileName };
        onSave(licenseData);
        setIsUploading(false);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>{licenseToEdit ? 'Renew License' : 'Add New License'}</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                        <div>
                            <label style={styles.label}>License Name*</label>
                            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} readOnly={!!licenseToEdit} />
                        </div>
                        <div>
                            <label style={styles.label}>New Expiry Date*</label>
                            <input style={styles.input} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                        </div>
                         <div>
                            <label style={styles.label}>License Number</label>
                            <input style={styles.input} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} readOnly={!!licenseToEdit}/>
                        </div>
                        <div>
                            <label style={styles.label}>Issuing Authority</label>
                            <input style={styles.input} value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} readOnly={!!licenseToEdit}/>
                        </div>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Notes</label>
                        <textarea style={{...styles.input, height: '80px'}} value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Attach Document</label>
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                        {licenseToEdit?.fileName && !file && <p style={{fontSize: '0.875rem', color: '#718096', marginTop: '0.25rem'}}>Current file: {licenseToEdit.fileName}</p>}
                    </div>
                    {error && <p style={{color: '#e53e3e', fontSize: '0.875rem', marginBottom: '1rem'}}>{error}</p>}
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                        <button style={{...styles.button, ...styles.buttonSecondary}} type="button" onClick={onCancel}>Cancel</button>
                        <button style={{...styles.button, ...styles.buttonPrimary}} type="submit" disabled={isUploading}>{isUploading ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LicenseList = ({ licenses, onRenew, onDelete, onAddLicenseClick, onExport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredLicenses = licenses.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const sortedLicenses = [...filteredLicenses].sort((a,b) => a.expiryDate.toDate() - b.expiryDate.toDate());

    return (
        <div style={styles.licenseListContainer}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #edf2f7', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <input style={{...styles.input, flexGrow: 1, minWidth: '200px'}} placeholder="Search by license name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={onExport}>Export Data</button>
                    <button style={{...styles.button, ...styles.buttonPrimary}} onClick={onAddLicenseClick}>+ Add License</button>
                </div>
            </div>
            {sortedLicenses.length === 0 ? (
                 <div style={{textAlign: 'center', color: '#718096', padding: '2.5rem 0'}}><p>{licenses.length > 0 ? "No licenses match your search." : "No licenses added yet."}</p></div>
            ) : (
                <ul style={{listStyle: 'none', margin: 0, padding: 0}}>{sortedLicenses.map(license => (
                    <li key={license.id} style={styles.licenseItem}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                        <div style={styles.licenseItemHeader}>
                            <h3 style={styles.licenseItemTitle}>{license.name}</h3>
                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                <button style={{...styles.button, backgroundColor: '#38a169', color: 'white', fontSize: '0.8rem', padding: '0.4rem 0.8rem'}} onClick={() => onRenew(license.id)}>Renew</button>
                                <button style={{...styles.button, ...styles.buttonDanger, fontSize: '0.8rem', padding: '0.4rem 0.8rem'}} onClick={() => onDelete(license.id)}>Delete</button>
                            </div>
                        </div>
                        <div style={styles.licenseDetailsGrid}>
                            <p><strong>Expires on:</strong> {formatDate(license.expiryDate)}</p>
                            {license.licenseNumber && <p><strong>License No:</strong> {license.licenseNumber}</p>}
                            {license.issuingAuthority && <p><strong>Authority:</strong> {license.issuingAuthority}</p>}
                            {license.fileURL && <a href={license.fileURL} target="_blank" rel="noopener noreferrer" style={styles.link}>View Document</a>}
                        </div>
                        {license.notes && <p style={{marginTop: '0.5rem', fontSize: '0.875rem', color: '#4a5568', backgroundColor: '#f7fafc', padding: '0.5rem', borderRadius: '0.25rem'}}><strong>Notes:</strong> {license.notes}</p>}
                    </li>
                ))}</ul>
            )}
        </div>
    );
};

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div style={styles.modalOverlay}>
        <div style={{...styles.modalContent, maxWidth: '448px'}}>
            <h3 style={styles.modalTitle}>Confirm Action</h3>
            <p style={{color: '#4a5568', marginBottom: '1.5rem'}}>{message}</p>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button style={{...styles.button, ...styles.buttonSecondary}} onClick={onCancel}>Cancel</button>
                <button style={{...styles.button, ...styles.buttonDanger}} onClick={onConfirm}>Delete</button>
            </div>
        </div>
    </div>
);

const LicenseTrackerView = ({ db, userId, storage }) => {
    const [licenses, setLicenses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [licenseToEdit, setLicenseToEdit] = useState(null);
    const [licenseToDelete, setLicenseToDelete] = useState(null);

    useEffect(() => {
        if (db && userId) {
            const licensesCollectionPath = `users/${userId}/licenses`;
            const q = query(collection(db, licensesCollectionPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const licensesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLicenses(licensesData);
            });
            return () => unsubscribe();
        }
    }, [db, userId]);

    const handleSave = (licenseData) => {
        const collectionPath = `users/${userId}/licenses`;
        if (licenseToEdit) {
            updateDoc(doc(db, collectionPath, licenseToEdit.id), licenseData).then(() => {
                setShowModal(false); setLicenseToEdit(null);
            });
        } else {
            addDoc(collection(db, collectionPath), licenseData).then(() => setShowModal(false));
        }
    };
    
    const handleDeleteRequest = (id) => setLicenseToDelete(id);
    const handleConfirmDelete = async () => {
        if (db && userId && licenseToDelete) {
            await deleteDoc(doc(db, `users/${userId}/licenses`, licenseToDelete));
        }
        setLicenseToDelete(null);
    };
    const handleRenewClick = (id) => {
        setLicenseToEdit(licenses.find(l => l.id === id));
        setShowModal(true);
    };
    const handleExportData = () => {
        if (licenses.length === 0) { alert("No license data to export."); return; }
        const headers = ["License Name", "Expiry Date", "License Number", "Issuing Authority", "Notes", "File URL"];
        const csvRows = [headers.join(",")];
        licenses.forEach(license => {
            const row = [`"${license.name || ''}"`, `"${formatDate(license.expiryDate) || ''}"`, `"${license.licenseNumber || ''}"`, `"${license.issuingAuthority || ''}"`, `"${(license.notes || '').replace(/"/g, '""')}"`, `"${license.fileURL || ''}"`];
            csvRows.push(row.join(","));
        });
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "licenses-export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <FlashMessage licenses={licenses} />
            <LicenseList licenses={licenses} onRenew={handleRenewClick} onDelete={handleDeleteRequest} onAddLicenseClick={() => { setLicenseToEdit(null); setShowModal(true); }} onExport={handleExportData} />
            {showModal && <LicenseFormModal onSave={handleSave} onCancel={() => { setShowModal(false); setLicenseToEdit(null); }} licenseToEdit={licenseToEdit} storage={storage} userId={userId} />}
            {licenseToDelete && <ConfirmationModal message="Are you sure you want to delete this license? This action cannot be undone." onConfirm={handleConfirmDelete} onCancel={() => setLicenseToDelete(null)} />}
        </>
    );
};

// --- Staff Attendance Components ---
const StaffAttendanceView = ({ db, userId, staff, leaves, attendance, stores, todayString, today }) => {
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState('All');
    
    const handleAddStaff = async (staffData) => {
        await addDoc(collection(db, `users/${userId}/staff`), staffData);
        setShowStaffModal(false);
    };

    const handleSetAttendance = async (staffId, status) => {
        await setDoc(doc(db, `users/${userId}/attendance`, todayString), { [staffId]: status }, { merge: true });
    };
    
    const handleAddLeave = async (leaveData) => {
        await addDoc(collection(db, `users/${userId}/leaves`), {
            ...leaveData,
            startDate: Timestamp.fromDate(new Date(leaveData.startDate)),
            endDate: Timestamp.fromDate(new Date(leaveData.endDate)),
        });
        setShowLeaveModal(false);
    };

    const calculateLeaveBalances = useMemo(() => {
        const balances = {};
        staff.forEach(member => {
            const taken = { CL: 0, SL: 0, EL: 0 };
            leaves.filter(l => l.staffId === member.id).forEach(l => {
                taken[l.leaveType] = (taken[l.leaveType] || 0) + 1;
            });
            balances[member.id] = {
                CL: { total: member.totalCL || 0, taken: taken.CL, balance: (member.totalCL || 0) - taken.CL },
                SL: { total: member.totalSL || 0, taken: taken.SL, balance: (member.totalSL || 0) - taken.SL },
                EL: { total: member.totalEL || 0, taken: taken.EL, balance: (member.totalEL || 0) - taken.EL },
            };
        });
        return balances;
    }, [staff, leaves]);

    const filteredStaff = staff.filter(s => selectedStore === 'All' || s.store === selectedStore);

    return (
        <div style={styles.gridContainer}>
            {/* Store Filter */}
            <div style={{...styles.card, padding: '1rem'}}>
                <label style={styles.label}>Filter by Store</label>
                <select style={styles.input} value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                    {stores.map(store => <option key={store} value={store}>{store}</option>)}
                </select>
            </div>

            {/* Today's Attendance */}
            <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Today's Attendance ({today.toLocaleDateString()})</h2>
                {filteredStaff.map(member => {
                    const status = attendance[member.id] || 'Not Marked';
                    let statusColor = '#a0aec0';
                    if (status === 'Present') statusColor = '#38a169';
                    if (status === 'Absent') statusColor = '#e53e3e';
                    if (status === 'On Leave') statusColor = '#dd6b20';

                    return (
                        <div key={member.id} style={styles.item}>
                            <p style={{fontWeight: '500'}}>{member.name}</p>
                            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                <span style={{...styles.statusButton, backgroundColor: statusColor, color: 'white'}}>{status}</span>
                                <button onClick={() => handleSetAttendance(member.id, 'Present')} style={{...styles.button, fontSize: '0.8rem', padding: '0.4rem 0.6rem', backgroundColor: '#c6f6d5'}}>P</button>
                                <button onClick={() => handleSetAttendance(member.id, 'Absent')} style={{...styles.button, fontSize: '0.8rem', padding: '0.4rem 0.6rem', backgroundColor: '#fed7d7'}}>A</button>
                                <button onClick={() => handleSetAttendance(member.id, 'On Leave')} style={{...styles.button, fontSize: '0.8rem', padding: '0.4rem 0.6rem', backgroundColor: '#feebc8'}}>L</button>
                            </div>
                        </div>
                    );
                })}
                 {filteredStaff.length === 0 && <p style={{textAlign: 'center', color: '#718096'}}>No staff members found for this store.</p>}
            </div>

            {/* Leave Balance */}
            <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Leave Balance</h2>
                <div style={{overflowX: 'auto'}}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Staff Name</th>
                                <th style={styles.th}>CL (Total/Taken/Bal)</th>
                                <th style={styles.th}>SL (Total/Taken/Bal)</th>
                                <th style={styles.th}>EL (Total/Taken/Bal)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map(member => {
                                const balance = calculateLeaveBalances[member.id];
                                return (
                                    <tr key={member.id}>
                                        <td style={{...styles.td, textAlign: 'left', fontWeight: '500'}}>{member.name}</td>
                                        <td style={styles.td}>{balance.CL.total} / {balance.CL.taken} / {balance.CL.balance}</td>
                                        <td style={styles.td}>{balance.SL.total} / {balance.SL.taken} / {balance.SL.balance}</td>
                                        <td style={styles.td}>{balance.EL.total} / {balance.EL.taken} / {balance.EL.balance}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Leave Management */}
            <div style={styles.card}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h2 style={{...styles.sectionTitle, marginBottom: 0, border: 'none'}}>Leave Records</h2>
                    <button style={{...styles.button, ...styles.buttonPrimary}} onClick={() => setShowLeaveModal(true)}>+ Add Leave</button>
                </div>
                {leaves.map(leave => (
                    <div key={leave.id} style={styles.item}>
                        <div>
                            <p style={{fontWeight: '500'}}>{leave.staffName} ({leave.leaveType})</p>
                            <p style={{fontSize: '0.875rem', color: '#718096'}}>Reason: {leave.reason}</p>
                        </div>
                        <p style={{fontSize: '0.875rem'}}>{formatDate(leave.startDate)} to {formatDate(leave.endDate)}</p>
                    </div>
                ))}
                {leaves.length === 0 && <p style={{textAlign: 'center', color: '#718096'}}>No leave records found.</p>}
            </div>

            {/* Staff Management */}
            <div style={styles.card}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h2 style={{...styles.sectionTitle, marginBottom: 0, border: 'none'}}>Manage Staff</h2>
                    <button style={{...styles.button, ...styles.buttonPrimary}} onClick={() => setShowStaffModal(true)}>+ Add Staff</button>
                </div>
                {filteredStaff.map(member => (
                    <div key={member.id} style={styles.item}>
                        <p>{member.name} <span style={{fontSize: '0.8rem', color: '#718096'}}>({member.store})</span></p>
                        <button onClick={() => deleteDoc(doc(db, `users/${userId}/staff`, member.id))} style={{...styles.button, ...styles.buttonDanger, fontSize: '0.8rem', padding: '0.2rem 0.6rem'}}>Remove</button>
                    </div>
                ))}
            </div>
            
            {showStaffModal && <StaffFormModal stores={stores.filter(s => s !== 'All')} onSave={handleAddStaff} onCancel={() => setShowStaffModal(false)} />}
            {showLeaveModal && <LeaveFormModal staff={staff} onSave={handleAddLeave} onCancel={() => setShowLeaveModal(false)} />}
        </div>
    );
};

const StaffFormModal = ({ stores, onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [store, setStore] = useState('');
    const [totalCL, setTotalCL] = useState(0);
    const [totalSL, setTotalSL] = useState(0);
    const [totalEL, setTotalEL] = useState(0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !store) { alert("Please fill out name and store."); return; }
        onSave({ name, store, totalCL: Number(totalCL), totalSL: Number(totalSL), totalEL: Number(totalEL) });
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>Add New Staff Member</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Staff Name</label>
                        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Assign to Store</label>
                        <select style={styles.input} value={store} onChange={(e) => setStore(e.target.value)} required>
                            <option value="" disabled>Select a Store</option>
                            {stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                        <div><label style={styles.label}>Total CL</label><input style={styles.input} type="number" value={totalCL} onChange={(e) => setTotalCL(e.target.value)} /></div>
                        <div><label style={styles.label}>Total SL</label><input style={styles.input} type="number" value={totalSL} onChange={(e) => setTotalSL(e.target.value)} /></div>
                        <div><label style={styles.label}>Total EL</label><input style={styles.input} type="number" value={totalEL} onChange={(e) => setTotalEL(e.target.value)} /></div>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                        <button style={{...styles.button, ...styles.buttonSecondary}} type="button" onClick={onCancel}>Cancel</button>
                        <button style={{...styles.button, ...styles.buttonPrimary}} type="submit">Add Staff</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LeaveFormModal = ({ staff, onSave, onCancel }) => {
    const [staffId, setStaffId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [leaveType, setLeaveType] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!staffId || !startDate || !endDate || !reason || !leaveType) { alert("Please fill out all fields."); return; }
        const staffName = staff.find(s => s.id === staffId)?.name;
        onSave({ staffId, staffName, startDate, endDate, reason, leaveType });
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>Add Leave Request</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Staff Member</label>
                        <select style={styles.input} value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
                            <option value="" disabled>Select Staff</option>
                            {staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                        </select>
                    </div>
                     <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Leave Type</label>
                        <select style={styles.input} value={leaveType} onChange={(e) => setLeaveType(e.target.value)} required>
                            <option value="" disabled>Select Type</option>
                            <option value="CL">CL (Casual Leave)</option>
                            <option value="SL">SL (Sick Leave)</option>
                            <option value="EL">EL (Earned Leave)</option>
                        </select>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                        <div><label style={styles.label}>Start Date</label><input style={styles.input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
                        <div><label style={styles.label}>End Date</label><input style={styles.input} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></div>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Reason</label>
                        <input style={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Personal Leave" required />
                    </div>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                        <button style={{...styles.button, ...styles.buttonSecondary}} type="button" onClick={onCancel}>Cancel</button>
                        <button style={{...styles.button, ...styles.buttonPrimary}} type="submit">Save Leave</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Reporting Components ---
const ReportingView = ({ staff, leaves, attendance, stores, today, leaveBalances }) => {
    const exportToCSV = (data, filename) => {
        if (data.length === 0) { alert("No data to export."); return; }
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(",")];
        data.forEach(item => {
            const row = headers.map(header => `"${(item[header] || '').toString().replace(/"/g, '""')}"`);
            csvRows.push(row.join(","));
        });
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportStaff = () => exportToCSV(staff, 'staff_list.csv');
    const handleExportLeaves = () => exportToCSV(leaves.map(l => ({...l, startDate: formatDate(l.startDate), endDate: formatDate(l.endDate)})), 'leave_records.csv');
    const handleExportBalances = () => {
        const balanceData = staff.map(s => ({
            Name: s.name,
            Store: s.store,
            'CL Total': leaveBalances[s.id]?.CL.total,
            'CL Taken': leaveBalances[s.id]?.CL.taken,
            'CL Balance': leaveBalances[s.id]?.CL.balance,
            'SL Total': leaveBalances[s.id]?.SL.total,
            'SL Taken': leaveBalances[s.id]?.SL.taken,
            'SL Balance': leaveBalances[s.id]?.SL.balance,
            'EL Total': leaveBalances[s.id]?.EL.total,
            'EL Taken': leaveBalances[s.id]?.EL.taken,
            'EL Balance': leaveBalances[s.id]?.EL.balance,
        }));
        exportToCSV(balanceData, 'leave_balances.csv');
    };

    const attendanceSummary = useMemo(() => {
        const summary = { Present: 0, Absent: 0, 'On Leave': 0, 'Not Marked': 0 };
        staff.forEach(s => {
            const status = attendance[s.id] || 'Not Marked';
            summary[status]++;
        });
        return summary;
    }, [staff, attendance]);

    const leaveTypeSummary = useMemo(() => {
        const summary = { CL: 0, SL: 0, EL: 0 };
        leaves.forEach(l => summary[l.leaveType]++);
        return summary;
    }, [leaves]);
    
    const staffByStore = useMemo(() => {
        const summary = {};
        stores.filter(s => s !== 'All').forEach(s => summary[s] = 0);
        staff.forEach(s => {
            if(summary[s.store] !== undefined) summary[s.store]++;
        });
        return summary;
    }, [staff, stores]);

    return (
        <div style={styles.gridContainer}>
            <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Export Data</h2>
                <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={handleExportStaff}>Export Staff List</button>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={handleExportLeaves}>Export Leave Records</button>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={handleExportBalances}>Export Leave Balances</button>
                </div>
            </div>
            <div style={styles.card}>
                <h2 style={styles.sectionTitle}>On-Screen Summary</h2>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem'}}>
                    <div>
                        <h3 style={{fontWeight: '600', marginBottom: '0.5rem'}}>Today's Attendance ({today.toLocaleDateString()})</h3>
                        {Object.entries(attendanceSummary).map(([status, count]) => <p key={status}>{status}: {count}</p>)}
                    </div>
                     <div>
                        <h3 style={{fontWeight: '600', marginBottom: '0.5rem'}}>Total Leaves Taken</h3>
                        {Object.entries(leaveTypeSummary).map(([type, count]) => <p key={type}>{type}: {count}</p>)}
                    </div>
                     <div>
                        <h3 style={{fontWeight: '600', marginBottom: '0.5rem'}}>Staff per Store</h3>
                        {Object.entries(staffByStore).map(([store, count]) => <p key={store}>{store}: {count}</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Administration Components ---
const AdministrationView = ({ db, userId, admins }) => {
    const [showAdminModal, setShowAdminModal] = useState(false);

    const handleAddAdmin = async (adminData) => {
        await addDoc(collection(db, `users/${userId}/admins`), adminData);
        setShowAdminModal(false);
    };

    return (
        <div style={styles.gridContainer}>
            <div style={styles.card}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h2 style={{...styles.sectionTitle, marginBottom: 0, border: 'none'}}>Administrators</h2>
                    <button style={{...styles.button, ...styles.buttonPrimary}} onClick={() => setShowAdminModal(true)}>+ Add Admin</button>
                </div>
                {admins.map(admin => (
                    <div key={admin.id} style={styles.item}>
                        <div>
                            <p style={{fontWeight: '500'}}>{admin.name} <span style={{fontSize: '0.8rem', color: '#718096'}}>({admin.designation})</span></p>
                            <p style={{fontSize: '0.875rem', color: '#718096'}}>{admin.email} | {admin.mobile}</p>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, `users/${userId}/admins`, admin.id))} style={{...styles.button, ...styles.buttonDanger, fontSize: '0.8rem', padding: '0.2rem 0.6rem'}}>Remove</button>
                    </div>
                ))}
                {admins.length === 0 && <p style={{textAlign: 'center', color: '#718096'}}>No administrators added yet.</p>}
            </div>
            {showAdminModal && <AdminFormModal onSave={handleAddAdmin} onCancel={() => setShowAdminModal(false)} />}
        </div>
    );
};

const AdminFormModal = ({ onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [designation, setDesignation] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !email || !mobile || !designation) { alert("Please fill out all fields."); return; }
        onSave({ name, email, mobile, designation });
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '500px'}}>
                <h2 style={styles.modalTitle}>Add New Administrator</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Name</label>
                        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Designation</label>
                        <input style={styles.input} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g., Manager" required />
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Email Address</label>
                        <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Mobile Number</label>
                        <input style={styles.input} type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                    </div>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                        <button style={{...styles.button, ...styles.buttonSecondary}} type="button" onClick={onCancel}>Cancel</button>
                        <button style={{...styles.button, ...styles.buttonPrimary}} type="submit">Add Admin</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Contact Us Component ---
const ContactUsView = () => {
    // --- CUSTOMIZE YOUR CONTACT DETAILS HERE ---
    const address = "Sri Guru Ram Das Pharmacy inside Sri Guru Ram Das Hospital, Vallah, Amritsar, Punjab";
    const email = "sgrdimsr.pharmacy@gmail.com";
    const phone = "01832870397";

    return (
        <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Contact Information</h2>
            <div style={{lineHeight: 1.6}}>
                <p><strong>Address:</strong><br/>{address}</p>
                <p style={{marginTop: '1rem'}}><strong>Email:</strong><br/><a href={`mailto:${email}`} style={styles.link}>{email}</a></p>
                <p style={{marginTop: '1rem'}}><strong>Phone:</strong><br/><a href={`tel:${phone}`} style={styles.link}>{phone}</a></p>
            </div>
        </div>
    );
};


// --- App Navigator ---
const AppNavigator = ({ activeView, setActiveView }) => (
    <div style={styles.navContainer}>
        <button style={activeView === 'dashboard' ? {...styles.navButton, ...styles.navButtonActive} : {...styles.navButton, ...styles.navButtonInactive}} onClick={() => setActiveView('dashboard')}>Dashboard</button>
        <button style={activeView === 'licenses' ? {...styles.navButton, ...styles.navButtonActive} : {...styles.navButton, ...styles.navButtonInactive}} onClick={() => setActiveView('licenses')}>Licenses</button>
        <button style={activeView === 'attendance' ? {...styles.navButton, ...styles.navButtonActive} : {...styles.navButton, ...styles.navButtonInactive}} onClick={() => setActiveView('attendance')}>Attendance</button>
        <button style={activeView === 'reporting' ? {...styles.navButton, ...styles.navButtonActive} : {...styles.navButton, ...styles.navButtonInactive}} onClick={() => setActiveView('reporting')}>Reporting</button>
        <button style={activeView === 'administration' ? {...styles.navButton, ...styles.navButtonActive} : {...styles.navButton, ...styles.navButtonInactive}} onClick={() => setActiveView('administration')}>Administration</button>
        <button style={activeView === 'contact' ? {...styles.navButton, ...styles.navButtonActive} : {...styles.navButton, ...styles.navButtonInactive}} onClick={() => setActiveView('contact')}>Contact Us</button>
    </div>
);


export default function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [storage, setStorage] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState('dashboard');
    
    const [staff, setStaff] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [admins, setAdmins] = useState([]);
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const stores = ["All", "Store 1", "Store 2", "Store 3", "Store 4", "Store 5", "Store 6"];

    useEffect(() => {
        try {
            const firebaseConfig = {
              apiKey: "AIzaSyDpnXYEonbPC_Gx2yEm_g97ZygXp9KUxjU",
              authDomain: "sri-guru-ram-daspharmacy-dl.firebaseapp.com",
              projectId: "sri-guru-ram-daspharmacy-dl",
              storageBucket: "sri-guru-ram-daspharmacy-dl.appspot.com",
              messagingSenderId: "292336822543",
              appId: "1:292336822543:web:521afde212cd3b77a3b67a",
              measurementId: "G-665M4J6WE9"
            };
            const app = initializeApp(firebaseConfig);
            setAuth(getAuth(app));
            setDb(getFirestore(app));
            setStorage(getStorage(app));
        } catch (e) { console.error("CRITICAL FIREBASE ERROR:", e); setIsLoading(false); }
    }, []);
    
    useEffect(() => {
        if(auth) {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                setUserId(user ? user.uid : null);
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [auth]);

    // Global data fetching
    useEffect(() => {
        if (!db || !userId) return;
        const unsubStaff = onSnapshot(collection(db, `users/${userId}/staff`), (snap) => setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubLeaves = onSnapshot(collection(db, `users/${userId}/leaves`), (snap) => setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubAdmins = onSnapshot(collection(db, `users/${userId}/admins`), (snap) => setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubAttendance = onSnapshot(doc(db, `users/${userId}/attendance`, todayString), (docSnap) => setAttendance(docSnap.exists() ? docSnap.data() : {}));
        return () => { unsubStaff(); unsubLeaves(); unsubAdmins(); unsubAttendance(); };
    }, [db, userId, todayString]);
    
    const leaveBalances = useMemo(() => {
        const balances = {};
        staff.forEach(member => {
            const taken = { CL: 0, SL: 0, EL: 0 };
            leaves.filter(l => l.staffId === member.id).forEach(l => {
                taken[l.leaveType] = (taken[l.leaveType] || 0) + 1;
            });
            balances[member.id] = {
                CL: { total: member.totalCL || 0, taken: taken.CL, balance: (member.totalCL || 0) - taken.CL },
                SL: { total: member.totalSL || 0, taken: taken.SL, balance: (member.totalSL || 0) - taken.SL },
                EL: { total: member.totalEL || 0, taken: taken.EL, balance: (member.totalEL || 0) - taken.EL },
            };
        });
        return balances;
    }, [staff, leaves]);
    
    const handleSignUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const handleSignIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const handlePasswordReset = (email) => sendPasswordResetEmail(auth, email);
    const handleSignOut = () => signOut(auth);

    if (isLoading) {
        return <div style={{...styles.pageContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;
    }

    if (!userId) {
        return <AuthPage onSignIn={handleSignIn} onSignUp={handleSignUp} onPasswordReset={handlePasswordReset} />;
    }

    return (
        <div style={styles.pageContainer}>
            <div style={styles.appContainer}>
                <Header onSignOut={handleSignOut} />
                <main>
                    <AppNavigator activeView={activeView} setActiveView={setActiveView} />
                    {activeView === 'dashboard' && <Dashboard />}
                    {activeView === 'licenses' && <LicenseTrackerView db={db} userId={userId} storage={storage} />}
                    {activeView === 'attendance' && <StaffAttendanceView db={db} userId={userId} staff={staff} leaves={leaves} attendance={attendance} stores={stores} today={today} todayString={todayString} />}
                    {activeView === 'reporting' && <ReportingView staff={staff} leaves={leaves} attendance={attendance} stores={stores} today={today} leaveBalances={leaveBalances} />}
                    {activeView === 'administration' && <AdministrationView db={db} userId={userId} admins={admins} />}
                    {activeView === 'contact' && <ContactUsView />}
                </main>
            </div>
        </div>
    );
}
