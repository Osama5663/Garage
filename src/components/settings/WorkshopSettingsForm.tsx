import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAuthStore } from '../../stores/authStore'
import { Save, Upload, Building, MapPin, Phone, Mail, Globe, Clock, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'
import { t } from '../../i18n'

const WorkshopSettingsForm: React.FC = () => {
  const { workshop, updateWorkshop, isLoading } = useSettingsStore()
  const { logActivity } = useAuthStore()
  
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    logo: '',
    logoUrl: '',
    ifNumber: '',
    ice: '',
    rib: '',
    patent: '',
    footerAddress: '',
    footerContact: '',
    footerLegal: ''
  })
  
  const [businessHours, setBusinessHours] = useState({
    monday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    friday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '15:00' },
    sunday: { isOpen: false }
  })
  
  const [socialMedia, setSocialMedia] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (workshop) {
      setFormData({
        name: workshop.name,
        companyName: workshop.companyName || workshop.name,
        address: workshop.address,
        phone: workshop.phone,
        email: workshop.email,
        website: workshop.website || '',
        taxId: workshop.taxId || '',
        logo: workshop.logo || '',
        logoUrl: workshop.logoUrl || workshop.logo || '',
        ifNumber: (workshop as any).ifNumber || '',
        ice: (workshop as any).ice || '',
        rib: (workshop as any).rib || '',
        patent: (workshop as any).patent || '',
        footerAddress: workshop.footerAddress || workshop.address || '',
        footerContact: workshop.footerContact || `Phone: ${workshop.phone}\nEmail: ${workshop.email}\nWebsite: ${workshop.website || ''}`,
        footerLegal: workshop.footerLegal || `ICE: ${workshop.ice || ''}\nRC: ${workshop.patent || ''}\nTVA: ${workshop.taxId || ''}\nRIB: ${workshop.rib || ''}`
      })
      
      if (workshop.businessHours) {
        // Normalize business hours to ensure all fields exist
        const normalizedHours = {
          monday: { openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00', ...workshop.businessHours.monday, isOpen: workshop.businessHours.monday?.isOpen ?? true },
          tuesday: { openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00', ...workshop.businessHours.tuesday, isOpen: workshop.businessHours.tuesday?.isOpen ?? true },
          wednesday: { openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00', ...workshop.businessHours.wednesday, isOpen: workshop.businessHours.wednesday?.isOpen ?? true },
          thursday: { openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00', ...workshop.businessHours.thursday, isOpen: workshop.businessHours.thursday?.isOpen ?? true },
          friday: { openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00', ...workshop.businessHours.friday, isOpen: workshop.businessHours.friday?.isOpen ?? true },
          saturday: { openTime: '09:00', closeTime: '15:00', ...workshop.businessHours.saturday, isOpen: workshop.businessHours.saturday?.isOpen ?? true },
          sunday: { ...workshop.businessHours.sunday, isOpen: workshop.businessHours.sunday?.isOpen ?? false }
        }
        setBusinessHours(normalizedHours as any)
      }
      
      if (workshop.socialMedia) {
        // Normalize social media links
        const normalizedSocial = {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
          ...workshop.socialMedia
        }
        setSocialMedia(normalizedSocial as any)
      }
    }
  }, [workshop])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Workshop name is required'
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[\d\s\-()+]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Please enter a valid website URL (include http:// or https://)'
    }
    
    // Validate business hours
    Object.entries(businessHours).forEach(([day, schedule]) => {
      if (schedule.isOpen) {
        const scheduleAny = schedule as any
        if (!scheduleAny.openTime || scheduleAny.openTime.trim() === '') {
          newErrors[`${day}Open`] = 'Open time is required'
        }
        if (!scheduleAny.closeTime || scheduleAny.closeTime.trim() === '') {
          newErrors[`${day}Close`] = 'Close time is required'
        }
        if (scheduleAny.openTime && scheduleAny.closeTime && scheduleAny.openTime >= scheduleAny.closeTime) {
          newErrors[`${day}Time`] = 'Close time must be after open time'
        }
      }
    })
    
    if (formData.ifNumber && !/^\d{6,8}$/.test(formData.ifNumber)) {
      newErrors.ifNumber = t('settings.morocco.errors.if')
    }
    if (formData.ice && !/^\d{15}$/.test(formData.ice)) {
      newErrors.ice = t('settings.morocco.errors.ice')
    }
    if (formData.patent && !/^\d{5,7}$/.test(formData.patent)) {
      newErrors.patent = t('settings.morocco.errors.patent')
    }
    if (formData.rib && !/^\d{20,24}$/.test(formData.rib.replace(/\s+/g, ''))) {
      newErrors.rib = t('settings.morocco.errors.rib')
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleBusinessHoursChange = (day: string, field: string, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }))
    if (errors[`${day}${field}`]) {
      setErrors(prev => ({ ...prev, [`${day}${field}`]: '' }))
    }
  }

  const handleSocialMediaChange = (platform: string, value: string) => {
    setSocialMedia(prev => ({ ...prev, [platform]: value }))
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors({ logo: 'Logo file must be less than 5MB' })
        return
      }
      
      if (!file.type.startsWith('image/')) {
        setErrors({ logo: 'Please select an image file' })
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setFormData(prev => ({ ...prev, logo: result, logoUrl: result }))
        setErrors(prev => ({ ...prev, logo: '' }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSaveStatus('saving')
    
    try {
      const workshopData = {
        ...formData,
        businessHours,
        socialMedia
      }
      
      const success = await updateWorkshop(workshopData)
      
      if (success) {
        setSaveStatus('saved')
        logActivity('WORKSHOP_SETTINGS_UPDATED', {
          updatedFields: Object.keys(formData),
          hasLogo: !!formData.logo
        })
        
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      setSaveStatus('error')
      console.error('Error saving workshop settings:', error)
    }
  }

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Building className="h-5 w-5 mr-2 text-blue-600" />
            {t('settings.workshop.basicInfo')}
          </h3>
        </div>
      <div className="p-6 space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.workshop.logo')}</label>
            <div className="flex items-center space-x-4">
              {formData.logo ? (
                <img src={formData.logo} alt="Workshop Logo" className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                  <Building className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('settings.workshop.uploadLogo')}
                </label>
                {errors.logo && (
                  <p className="mt-1 text-sm text-red-600">{errors.logo}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{t('settings.workshop.logoNote')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workshop Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.workshop.name')}</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder={t('settings.workshop.namePlaceholder')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Your Garage Ltd."
              />
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="ifNumber" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.morocco.if')}</label>
                  <input
                    type="text"
                    id="ifNumber"
                    value={formData.ifNumber}
                    onChange={(e) => handleInputChange('ifNumber', e.target.value)}
                    className={`block w-full px-3 py-2 border ${errors.ifNumber ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder={t('settings.morocco.ifPlaceholder')}
                  />
                  {errors.ifNumber && <p className="mt-1 text-sm text-red-600">{errors.ifNumber}</p>}
                </div>
                <div>
                  <label htmlFor="ice" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.morocco.ice')}</label>
                  <input
                    type="text"
                    id="ice"
                    value={formData.ice}
                    onChange={(e) => handleInputChange('ice', e.target.value)}
                    className={`block w-full px-3 py-2 border ${errors.ice ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder={t('settings.morocco.icePlaceholder')}
                  />
                  {errors.ice && <p className="mt-1 text-sm text-red-600">{errors.ice}</p>}
                </div>
                <div>
                  <label htmlFor="rib" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.morocco.rib')}</label>
                  <input
                    type="text"
                    id="rib"
                    value={formData.rib}
                    onChange={(e) => handleInputChange('rib', e.target.value)}
                    className={`block w-full px-3 py-2 border ${errors.rib ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder={t('settings.morocco.ribPlaceholder')}
                  />
                  {errors.rib && <p className="mt-1 text-sm text-red-600">{errors.rib}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="inline h-4 w-4 mr-1" />{t('settings.workshop.address')}</label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className={`block w-full px-3 py-2 border ${errors.address ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder={t('settings.workshop.addressPlaceholder')}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1"><Phone className="inline h-4 w-4 mr-1" />{t('settings.workshop.phone')}</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`block w-full px-3 py-2 border ${errors.phone ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder={t('settings.workshop.phonePlaceholder')}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1"><Mail className="inline h-4 w-4 mr-1" />{t('settings.workshop.email')}</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder={t('settings.workshop.emailPlaceholder')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Website */}
          <div className="md:col-span-2">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1"><Globe className="inline h-4 w-4 mr-1" />{t('settings.workshop.website')}</label>
            <input
              type="url"
              id="website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className={`block w-full px-3 py-2 border ${errors.website ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder={t('settings.workshop.websitePlaceholder')}
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-600">{errors.website}</p>
            )}
          </div>

          
        </div>
      </div>
      </div>

      {/* Morocco summary removed per request */}

      {/* Business Hours */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            {t('settings.workshop.businessHours')}
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {daysOfWeek.map(({ key, label }) => (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={businessHours[key as keyof typeof businessHours].isOpen}
                      onChange={(e) => handleBusinessHoursChange(key, 'isOpen', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 font-medium text-gray-900">{label}</span>
                  </label>
                </div>
                
                {businessHours[key as keyof typeof businessHours].isOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.workshop.openTime')}</label>
                      <input
                        type="time"
                        value={(businessHours[key as keyof typeof businessHours] as any).openTime || ''}
                        onChange={(e) => handleBusinessHoursChange(key, 'openTime', e.target.value)}
                        className={`block w-full px-3 py-2 border ${errors[`${key}Open`] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {errors[`${key}Open`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${key}Open`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.workshop.closeTime')}</label>
                      <input
                        type="time"
                        value={(businessHours[key as keyof typeof businessHours] as any).closeTime || ''}
                        onChange={(e) => handleBusinessHoursChange(key, 'closeTime', e.target.value)}
                        className={`block w-full px-3 py-2 border ${errors[`${key}Close`] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {errors[`${key}Close`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${key}Close`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.workshop.breakStart')}</label>
                      <input
                        type="time"
                        value={(businessHours[key as keyof typeof businessHours] as any).breakStart || ''}
                        onChange={(e) => handleBusinessHoursChange(key, 'breakStart', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.workshop.breakEnd')}</label>
                      <input
                        type="time"
                        value={(businessHours[key as keyof typeof businessHours] as any).breakEnd || ''}
                        onChange={(e) => handleBusinessHoursChange(key, 'breakEnd', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
                
                {errors[`${key}Time`] && (
                  <p className="mt-2 text-sm text-red-600">{errors[`${key}Time`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{t('settings.workshop.social')}</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
                <Facebook className="inline h-4 w-4 mr-1 text-blue-600" />
                Facebook
              </label>
              <input
                type="url"
                id="facebook"
                value={socialMedia.facebook}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                <Instagram className="inline h-4 w-4 mr-1 text-pink-600" />
                Instagram
              </label>
              <input
                type="url"
                id="instagram"
                value={socialMedia.instagram}
                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://instagram.com/yourpage"
              />
            </div>

            <div>
              <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">
                <Twitter className="inline h-4 w-4 mr-1 text-blue-400" />
                Twitter
              </label>
              <input
                type="url"
                id="twitter"
                value={socialMedia.twitter}
                onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://twitter.com/yourpage"
              />
            </div>

            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                <Linkedin className="inline h-4 w-4 mr-1 text-blue-700" />
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedin"
                value={socialMedia.linkedin}
                onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://linkedin.com/company/yourpage"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || saveStatus === 'saving'}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {t('settings.workshop.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('settings.workshop.save')}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default WorkshopSettingsForm
