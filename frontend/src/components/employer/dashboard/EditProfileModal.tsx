import React, { useEffect, useState } from "react";
import { X, Image } from "lucide-react";
import { TagInput } from "../../common/TagInput";

interface Props {
    show: boolean;
    onClose: () => void;
    onSave: (updatedFields: Record<string, any>) => void;
    profile: any;
}

const industryOptions = [
    "Information Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Manufacturing",
    "Retail",
    "others",
];

const companySizeOptions = [
   "Small (1-10 employees)",
   "Medium (11-100 employees)",
   "Large (100+ employees)",
];

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const EditProfileModal: React.FC<Props> = ({ show, onClose, onSave, profile }) => {
    const [formState, setFormState] = useState({
        name: "",
        industryType: "",
        address: "",
        telephone: "",
        panNumber: "",
        companySize: "",
        establishedDate: "",
        description: "",
        website: "",
        // `headline` (base User field) doubles as the company tagline shown
        // on the Company Profile page (Phase 1/3) — reused, not a new field.
        headline: "",
        mission: "",
        culture: "",
        // Comma-separated in the UI, same convention used across this
        // codebase (job skills/benefits, blog tags) — the backend already
        // splits these on "," (see employerController.js).
        companyLocations: "",
        companyBenefits: "",
        linkedin: "",
        companyLogo: null as File | null,
        coverPhoto: null as File | null,
    });

    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setFormState({
                name: profile.name || "",
                industryType: profile.industryType || "",
                address: profile.address || "",
                telephone: profile.telephone || "",
                panNumber: profile.panNumber || "",
                companySize: profile.companySize || "",
                establishedDate: profile.establishedDate?.split("T")[0] || "",
                description: profile.description || "",
                website: profile.website || "",
                headline: profile.headline || "",
                mission: profile.mission || "",
                culture: profile.culture || "",
                companyLocations: Array.isArray(profile.companyLocations) ? profile.companyLocations.join(", ") : "",
                companyBenefits: Array.isArray(profile.companyBenefits) ? profile.companyBenefits.join(", ") : "",
                linkedin: profile.socialLinks?.linkedin || "",
                companyLogo: null,
                coverPhoto: null,
            });
            if (profile.coverPhoto) {
                setCoverPreview(`${MEDIA_URL.replace(/\/$/, "")}/${profile.coverPhoto.replace(/^\//, "")}`);
            } else {
                setCoverPreview(null);
            }
            setLogoPreview(null);
        }
    }, [profile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormState(prev => ({ ...prev, companyLogo: file }));
        if (file) setLogoPreview(URL.createObjectURL(file));
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormState(prev => ({ ...prev, coverPhoto: file }));
        if (file) setCoverPreview(URL.createObjectURL(file));
    };

    const handleSave = () => {
        const updatedFields: Record<string, any> = {};
        for (const key in formState) {
            if (key === "linkedin") continue; // folded into socialLinks below
            const val = formState[key as keyof typeof formState];
            if (val !== "" && val !== null) {
                updatedFields[key] = val;
            }
        }
        // Backend expects a `socialLinks` object (or JSON string over this
        // multipart form) it merges into the existing value, not a flat
        // `linkedin` field — see employerController.js's updateEmployerProfile.
        if (formState.linkedin !== "") {
            updatedFields.socialLinks = JSON.stringify({ linkedin: formState.linkedin });
        }
        onSave(updatedFields);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-red-600">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4">Edit Employer Profile</h2>

                {/* Cover Photo — full width at top */}
                <div className="mb-5">
                    <label className="font-semibold flex items-center gap-1.5 mb-2">
                        <Image size={15} className="text-orange-500" /> Cover Photo
                        <span className="text-xs font-normal text-gray-400">(banner behind your logo)</span>
                    </label>
                    <div
                        className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer group"
                        onClick={() => document.getElementById("coverPhotoInput")?.click()}
                    >
                        {coverPreview ? (
                            <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center">
                                <span className="text-white/80 text-sm font-medium">Default gradient — click to upload your own</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                            <span className="hidden group-hover:block text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">
                                Change Cover Photo
                            </span>
                        </div>
                    </div>
                    <input id="coverPhotoInput" type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    {formState.coverPhoto && (
                        <p className="text-xs text-green-600 mt-1">✓ {formState.coverPhoto.name} selected</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="font-semibold">Company Name</label>
                        <input name="name" value={formState.name} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div>
                        <label className="font-semibold">Industry Type</label>
                        <select name="industryType" value={formState.industryType} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1">
                            <option value="">Select Industry</option>
                            {industryOptions.map((industry, idx) => (
                                <option key={idx} value={industry}>{industry}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold">Address</label>
                        <input name="address" value={formState.address} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div>
                        <label className="font-semibold">Telephone</label>
                        <input name="telephone" type="tel" value={formState.telephone} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div>
                        <label className="font-semibold">PAN Number</label>
                        <input name="panNumber" value={formState.panNumber} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div>
                        <label className="font-semibold">Company Size</label>
                        <select name="companySize" value={formState.companySize} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1">
                            <option value="">Select Size</option>
                            {companySizeOptions.map((size, idx) => (
                                <option key={idx} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold">Company Logo</label>
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full mt-1" />
                        {logoPreview && (
                            <img src={logoPreview} alt="Logo preview" className="mt-2 h-20 w-20 rounded object-cover border" />
                        )}
                    </div>

                    <div>
                        <label className="font-semibold">Established Date</label>
                        <input name="establishedDate" type="date" value={formState.establishedDate} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">Company Website</label>
                        <input name="website" type="url" placeholder="https://yourcompany.com" value={formState.website} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">About Company</label>
                        <textarea name="description" value={formState.description} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" rows={4} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">
                            Tagline <span className="text-xs font-normal text-gray-400">(short line shown under your company name)</span>
                        </label>
                        <input name="headline" placeholder="e.g. Building the future of work" value={formState.headline} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">LinkedIn Company URL</label>
                        <input name="linkedin" type="url" placeholder="https://linkedin.com/company/yourcompany" value={formState.linkedin} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">Mission</label>
                        <textarea name="mission" value={formState.mission} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" rows={2} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">Culture</label>
                        <textarea name="culture" value={formState.culture} onChange={handleInputChange} className="w-full border px-3 py-2 rounded mt-1" rows={2} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">Additional Office Locations</label>
                        <TagInput
                            value={formState.companyLocations}
                            onChange={(csv) => setFormState(prev => ({ ...prev, companyLocations: csv }))}
                            placeholder="Type a location and press Enter, e.g. Kathmandu"
                            className="mt-1"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold">Company Benefits</label>
                        <TagInput
                            value={formState.companyBenefits}
                            onChange={(csv) => setFormState(prev => ({ ...prev, companyBenefits: csv }))}
                            placeholder="Type a benefit and press Enter, e.g. Health insurance"
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;