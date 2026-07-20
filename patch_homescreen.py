import re

with open('/Users/devanshbehl/Documents/Code/Ipay/mobile-app/src/screens/HomeScreen.tsx', 'r') as f:
    code = f.read()

# 1. Add CreditCard and FlatList if not present
if 'CreditCard' not in code:
    code = re.sub(r'(import \{.*?)(\} from \'lucide-react-native\')', r'\1, CreditCard \2', code)
if 'FlatList' not in code:
    code = re.sub(r'(import \{.*?)(\} from \'react-native\')', r'\1, FlatList \2', code)

# 2. Replace the PIN state and handleCheckBalance logic
old_state = """  // PIN and Balance Reveal State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [activePinAccountId, setActivePinAccountId] = useState<string | null>(null);
  const [revealedBalances, setRevealedBalances] = useState<{ [key: string]: number | null }>({});

  const handleCheckBalance = async () => {
    if (pinInput.length < 4 || !activePinAccountId) return;
    try {
      const response = await api.post('/bank/balance', { userId, bankAccountId: activePinAccountId, upiPin: pinInput });
      setRevealedBalances(prev => ({ ...prev, [activePinAccountId]: response.data.balance }));
      setPinModalVisible(false);
      setPinInput('');
      
      // Auto hide after 15 seconds
      setTimeout(() => {
        setRevealedBalances(prev => ({ ...prev, [activePinAccountId]: null }));
      }, 15000);
    } catch (error) {
      Alert.alert('Error', 'Invalid UPI PIN');
    }
  };"""

new_state = """  // PIN and Balance Reveal State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'balance' | 'pay_request'>('balance');
  const [pinInput, setPinInput] = useState('');
  const [activePinAccountId, setActivePinAccountId] = useState<string | null>(null);
  const [revealedBalances, setRevealedBalances] = useState<{ [key: string]: number | null }>({});

  // Collect Request State
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [requestSending, setRequestSending] = useState(false);

  useEffect(() => {
    if (!user?.upiId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/gateway/pending-requests/${user.upiId}`);
        if (res.data && res.data.length > 0) {
          setPendingRequest((prev: any) => {
            if (!prev) {
              setRequestModalVisible(true);
              return res.data[0];
            }
            return prev;
          });
        } else {
            if (requestModalVisible && pendingRequest) {
                // If it was cleared externally
                setRequestModalVisible(false);
                setPendingRequest(null);
            }
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [user?.upiId, requestModalVisible]);

  const handlePinSubmit = async () => {
    if (pinMode === 'pay_request') {
       if (pinInput.length < 4 || !activePinAccountId || !pendingRequest) return;
       setRequestSending(true);
       try {
         await api.post(`/gateway/order/${pendingRequest.orderId}/pay`, { senderBankAccountId: activePinAccountId, upiPin: pinInput });
         setPinModalVisible(false);
         setPinInput('');
         setPendingRequest(null);
         Alert.alert('Success', 'Payment completed successfully!');
         const txRes = await api.get(`/transaction/history/${user.upiId}`);
         setTransactions(txRes.data);
         const bankRes = await api.get(`/bank/user/${user._id}`);
         setBankAccounts(bankRes.data);
       } catch (error: any) {
         Alert.alert('Error', error.response?.data?.error || 'Payment failed.');
       } finally {
         setRequestSending(false);
       }
       return;
    }

    if (pinInput.length < 4 || !activePinAccountId) return;
    try {
      const response = await api.post('/bank/balance', { userId, bankAccountId: activePinAccountId, upiPin: pinInput });
      setRevealedBalances(prev => ({ ...prev, [activePinAccountId]: response.data.balance }));
      setPinModalVisible(false);
      setPinInput('');
      setTimeout(() => {
        setRevealedBalances(prev => ({ ...prev, [activePinAccountId]: null }));
      }, 15000);
    } catch (error) {
      Alert.alert('Error', 'Invalid UPI PIN');
    }
  };"""

code = code.replace(old_state, new_state)

# 3. Replace onPress={handleCheckBalance} with onPress={handlePinSubmit}
code = code.replace('onPress={handleCheckBalance}', 'onPress={handlePinSubmit}')
code = code.replace('setPinModalVisible(true)', 'setPinMode(\'balance\'); setPinModalVisible(true)')

# 4. Add the modals just before </SafeAreaView>
modals_str = """
      {/* Payment Request Modal */}
      <Modal visible={requestModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.pinBottomSheet, { paddingBottom: 30 }]}>
            <View style={styles.pinSheetHandle} />
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Globe size={32} color="#FFF" />
            </View>
            <Text style={styles.pinTitle}>Payment Request</Text>
            <Text style={[styles.pinSubtitle, { textAlign: 'center', marginBottom: 30 }]}>
              <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{pendingRequest?.merchantName}</Text> is requesting a payment.
            </Text>
            <Text style={{ color: '#FFF', fontSize: 48, fontWeight: '800', marginBottom: 30 }}>₹{pendingRequest?.amount}</Text>
            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity style={[styles.verifyPinBtn, { flex: 1, backgroundColor: theme.surface3 }]} onPress={() => { setRequestModalVisible(false); setPendingRequest(null); }}>
                <Text style={[styles.verifyPinText, { color: '#FFF' }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.verifyPinBtn, { flex: 1 }]} onPress={() => { setRequestModalVisible(false); if (!activePinAccountId && bankAccounts.length > 0) setActivePinAccountId(bankAccounts[0]._id); setAccountModalVisible(true); }}>
                <Text style={styles.verifyPinText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Selection Modal */}
      <Modal visible={accountModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAccountModalVisible(false)} />
          <View style={styles.pinBottomSheet}>
            <View style={styles.pinSheetHandle} />
            <Text style={styles.pinTitle}>Select Account</Text>
            <FlatList
              data={bankAccounts}
              keyExtractor={item => item._id}
              style={{ width: '100%', marginTop: 20, maxHeight: 300 }}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={[{ flexDirection: 'row', width: '100%', alignItems: 'center', backgroundColor: theme.surface2, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.lineStrong, marginBottom: 12 }, activePinAccountId === item._id && { borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => {
                    setActivePinAccountId(item._id);
                    setAccountModalVisible(false);
                    setPinMode('pay_request');
                    setPinModalVisible(true);
                  }}
                >
                  <CreditCard size={24} color={activePinAccountId === item._id ? "#FFFFFF" : "#FFF"} />
                  <View style={{ marginLeft: 16 }}>
                    <Text style={[{ color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 }, activePinAccountId === item._id && { color: '#FFFFFF' }]}>{item.bankName}</Text>
                    <Text style={{ color: theme.text2, fontSize: 14, marginTop: 4, letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>•••• {item.accountNumber.slice(-4)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
"""

code = code.replace('    </SafeAreaView>', modals_str + '\n    </SafeAreaView>')
code = code.replace('{sending ? <ActivityIndicator color="#000" /> : <Text style={styles.verifyPinText}>Verify & Check</Text>}', '{requestSending ? <ActivityIndicator color="#000" /> : <Text style={styles.verifyPinText}>{pinMode === \'pay_request\' ? \'Verify & Pay\' : \'Verify & Check\'}</Text>}')
code = code.replace('<Text style={styles.verifyPinText}>Verify & Check</Text>', '{requestSending ? <ActivityIndicator color="#000" /> : <Text style={styles.verifyPinText}>{pinMode === \'pay_request\' ? \'Verify & Pay\' : \'Verify & Check\'}</Text>}')

with open('/Users/devanshbehl/Documents/Code/Ipay/mobile-app/src/screens/HomeScreen.tsx', 'w') as f:
    f.write(code)

