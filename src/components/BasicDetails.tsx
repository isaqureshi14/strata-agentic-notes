import React, { useState, useEffect } from 'react';
import { User, Save, CheckCircle, Upload, Trash2 } from 'lucide-react';

export interface SavedBasicDetails {
  studentName: string;
  motherName: string;
  fatherName: string;
  occupation: string;
  studentPhoto: string; // base64 data url
}

export const autofillFormFields = (
  savedDetails: SavedBasicDetails,
  currentFormData: Record<string, any>,
  setFormData: (data: any) => void
) => {
  const updatedData = { ...currentFormData };
  let filledAny = false;

  const keyMappings: Record<string, string[]> = {
    studentName: ['studentname', 'student_name', 'name', 'fullname', 'full_name', 'student'],
    motherName: ['mothername', 'mother_name', 'mname', 'mother'],
    fatherName: ['fathername', 'father_name', 'fname', 'father'],
    occupation: ['occupation', 'job', 'profession', 'work'],
    studentPhoto: ['studentphoto', 'student_photo', 'photo', 'image', 'avatar']
  };

  Object.entries(keyMappings).forEach(([savedKey, formKeys]) => {
    const savedVal = savedDetails[savedKey as keyof SavedBasicDetails];
    if (!savedVal) return;

    // Search keys in currentFormData case-insensitively
    const matchingFormKey = Object.keys(currentFormData).find(key => 
      formKeys.includes(key.toLowerCase())
    );

    if (matchingFormKey) {
      // Only populate if empty (safely checks without overwriting already manually typed fields)
      if (!currentFormData[matchingFormKey]) {
        updatedData[matchingFormKey] = savedVal;
        filledAny = true;
      }
    }
  });

  if (filledAny) {
    setFormData(updatedData);
  }
  return filledAny;
};

export const AutofillButton: React.FC<{
  formData: Record<string, any>;
  setFormData: (data: any) => void;
  onSuccess?: () => void;
}> = ({ formData, setFormData, onSuccess }) => {
  const handleAutofill = () => {
    const saved = localStorage.getItem('antigravity_basic_details');
    if (!saved) {
      alert('No basic details saved yet! Please configure them in the "My Basic Details" menu.');
      return;
    }
    const savedDetails = JSON.parse(saved);
    const success = autofillFormFields(savedDetails, formData, setFormData);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <button
      type="button"
      onClick={handleAutofill}
      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
    >
      <span>⚡ Autofill Basic Details</span>
    </button>
  );
};

interface BasicDetailsProps {
  darkMode: boolean;
  onBackToHome: () => void;
}

export const BasicDetails: React.FC<BasicDetailsProps> = ({ onBackToHome }) => {
  const [details, setDetails] = useState<SavedBasicDetails>({
    studentName: '',
    motherName: '',
    fatherName: '',
    occupation: '',
    studentPhoto: ''
  });
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('antigravity_basic_details');
    if (saved) {
      try {
        setDetails(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('antigravity_basic_details', JSON.stringify(details));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDetails(prev => ({ ...prev, studentPhoto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setDetails(prev => ({ ...prev, studentPhoto: '' }));
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-2xl mx-auto space-y-8 overflow-y-auto w-full h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-zinc-100 font-serif">My Basic Details</h2>
            <p className="text-xs text-gray-400">Manage student profile credentials for strata's One-Click Form Autofill system.</p>
          </div>
        </div>

        <button
          onClick={onBackToHome}
          className="h-10 px-4 rounded-none border border-charcoal/30 dark:border-white/30 text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all flex items-center justify-center text-xs font-sans font-bold tracking-wide uppercase cursor-pointer"
        >
          <span>&lt; HOME</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Student Photo upload section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50 dark:bg-[#252525] rounded-2xl border border-gray-100 dark:border-[#333]">
          <div className="relative w-24 h-24 rounded-full bg-gray-200 dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-[#4a4a4a] overflow-hidden flex items-center justify-center shrink-0">
            {details.studentPhoto ? (
              <img src={details.studentPhoto} alt="Student preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <h4 className="text-xs font-bold text-gray-700 dark:text-zinc-200">Student Photo</h4>
            <p className="text-[10px] text-gray-400">Upload a student profile image to link with autofill data (PNG, JPG, max 500KB).</p>
            <div className="flex gap-2 justify-center sm:justify-start">
              <label className="px-3.5 py-1.5 bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-white rounded-xl text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm">
                <Upload className="w-3 h-3" /> Select Photo
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {details.studentPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3.5 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-sans font-bold uppercase text-gray-500 dark:text-zinc-400">Student Name</label>
          <input
            type="text"
            value={details.studentName}
            onChange={e => setDetails({ ...details, studentName: e.target.value })}
            placeholder="Jane Doe"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] text-sm focus:border-gray-500 dark:focus:border-[#4a4a4a] outline-none text-charcoal dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-sans font-bold uppercase text-gray-500 dark:text-zinc-400">Mother's Name</label>
            <input
              type="text"
              value={details.motherName}
              onChange={e => setDetails({ ...details, motherName: e.target.value })}
              placeholder="Mary Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] text-sm focus:border-gray-500 dark:focus:border-[#4a4a4a] outline-none text-charcoal dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-sans font-bold uppercase text-gray-500 dark:text-zinc-400">Father's Name</label>
            <input
              type="text"
              value={details.fatherName}
              onChange={e => setDetails({ ...details, fatherName: e.target.value })}
              placeholder="Robert Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] text-sm focus:border-gray-500 dark:focus:border-[#4a4a4a] outline-none text-charcoal dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-sans font-bold uppercase text-gray-500 dark:text-zinc-400">Occupation</label>
          <input
            type="text"
            value={details.occupation}
            onChange={e => setDetails({ ...details, occupation: e.target.value })}
            placeholder="Software Developer"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] text-sm focus:border-gray-500 dark:focus:border-[#4a4a4a] outline-none text-charcoal dark:text-white"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="text-emerald-500 text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Details saved successfully!
              </span>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-sans font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" /> Save Details
          </button>
        </div>
      </form>
    </div>
  );
};
