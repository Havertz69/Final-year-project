# Property Pulse System Verification Guide

## 🚀 Quick Start

### Backend Server
1. **Start Backend**: Double-click `start-backend.bat`
2. **Verify**: Open http://127.0.0.1:8000/api/ in browser
3. **Admin Panel**: http://127.0.0.1:8000/admin/

### Frontend Application
1. **Start Frontend**: Double-click `start-frontend.bat`
2. **Access**: http://localhost:5173
3. **Login**: Use admin credentials or register new user

## 🔍 System Verification

### Built-in System Check
1. Login to admin portal
2. Click **"System Check"** button on any admin page
3. Check browser console for detailed results

### Manual Verification Steps

#### 1. Authentication ✅
- [ ] Login works with valid credentials
- [ ] Token is stored in localStorage
- [ ] User role is correctly identified
- [ ] Logout clears all stored data

#### 2. Admin Portal ✅
- [ ] Dashboard loads and shows KPIs
- [ ] Units page loads and displays units
- [ ] Properties dropdown populates in unit form
- [ ] Tenants page loads and shows tenant list
- [ ] Payments page loads and shows payment history
- [ ] Reports page loads and shows monthly reports
- [ ] Maintenance page loads and shows requests
- [ ] Payment Evidence page loads and shows evidence

#### 3. Tenant Portal ✅
- [ ] Dashboard loads and shows tenant info
- [ ] Profile page loads and shows tenant details
- [ ] Payments page loads and shows payment history
- [ ] Maintenance page loads and shows requests
- [ ] Notifications page loads and shows notifications
- [ ] Lease document page loads and shows lease

#### 4. Payment Flow ✅
- [ ] Tenant can submit payment
- [ ] Tenant can upload payment evidence
- [ ] Admin can view payment evidence
- [ ] Admin can approve/reject evidence
- [ ] Payment status updates automatically
- [ ] Tenant receives notification

## 🛠️ Troubleshooting

### Common Issues

#### Backend Not Running
```
Error: Network Error
```
**Solution**: Run `start-backend.bat` or `python manage.py runserver`

#### Database Connection Issues
```
Error: connection to server at "localhost" (127.0.0.1), port 5432 failed
```
**Solution**: 
1. Start PostgreSQL service
2. Check .env database credentials
3. Run `python manage.py migrate`

#### CORS Issues
```
Error: Access to fetch at 'http://127.0.0.1:8000/api/' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Solution**: Backend should handle this automatically. If persists, check CORS settings in `settings.py`

#### Authentication Issues
```
Error: 401 Unauthorized
```
**Solution**:
1. Clear browser localStorage
2. Login again
3. Check token in network tab

#### Missing Data
```
Error: adminService.getProperties is not a function
```
**Solution**: All service methods should now be included. Refresh the page

### Debug Tools

#### Browser Console
- Press F12 → Console tab
- Look for red error messages
- Use "System Check" button for comprehensive testing

#### Network Tab
- Press F12 → Network tab
- Check API requests for 200 status codes
- Verify request/response payloads

#### Backend Logs
- Check terminal where Django server is running
- Look for error messages and stack traces

## 📋 System Health Checklist

### Backend Health
- [ ] Django server running on port 8000
- [ ] PostgreSQL database connected
- [ ] All migrations applied
- [ ] CORS settings correct
- [ ] JWT tokens working

### Frontend Health
- [ ] React app running on port 5173
- [ ] API base URL correct (http://127.0.0.1:8000/api)
- [ ] Authentication context working
- [ ] All pages loading without errors
- [ ] Service calls matching backend endpoints

### Integration Health
- [ ] Admin can create/manage properties and units
- [ ] Admin can assign/unassign tenants
- [ ] Tenants can view their assigned units
- [ ] Payment workflow working end-to-end
- [ ] Notifications being sent/received
- [ ] File uploads working (payment evidence, lease docs)

## 🚨 Emergency Fixes

### Reset Everything
1. Stop both servers
2. Clear browser data (localStorage, cookies)
3. Delete node_modules and run `npm install`
4. Run `python manage.py migrate` again
5. Restart both servers

### Database Reset
```bash
# WARNING: This deletes all data!
python manage.py flush
python manage.py migrate
python manage.py createsuperuser
```

## 📞 Support

If issues persist:
1. Run "System Check" and copy console output
2. Check browser network tab for failed requests
3. Verify backend logs for errors
4. Ensure all environment variables are set correctly

The system should work seamlessly when all components are properly configured and running.
