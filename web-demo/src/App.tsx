import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountHolderName: '',
    bankName: '',
    balance: '',
    registeredMobileNumber: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://10.92.133.78:5001/api/bank/create', {
        ...formData,
        balance: Number(formData.balance)
      });
      setMessage('Bank account created successfully!');
      setFormData({ accountNumber: '', accountHolderName: '', bankName: '', balance: '', registeredMobileNumber: '' });
    } catch (err) {
      console.error(err);
      setMessage('Failed to create account.');
    }
  };

  return (
    <div className="container">
      <h1>InstaPay Demo Bank Setup</h1>
      <p>Use this to populate the demo database with bank accounts.</p>
      
      {message && <p className="message">{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>16-Digit Account Number:</label>
          <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} required maxLength={16} minLength={16} />
        </div>
        <div>
          <label>Account Holder Name:</label>
          <input name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} required />
        </div>
        <div>
          <label>Bank Name:</label>
          <input name="bankName" value={formData.bankName} onChange={handleChange} required />
        </div>
        <div>
          <label>Starting Balance:</label>
          <input name="balance" type="number" value={formData.balance} onChange={handleChange} required />
        </div>
        <div>
          <label>Registered Mobile Number:</label>
          <input name="registeredMobileNumber" value={formData.registeredMobileNumber} onChange={handleChange} required />
        </div>
        <button type="submit">Create Account</button>
      </form>
    </div>
  )
}

export default App
