import React, { useRef } from 'react';

interface ImageUploadProps {
    imageUrl: string | null;
    onImageChange: (imageUrl: string | null) => void;
    className?: string;
    isPreviewMode: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    imageUrl,
    onImageChange,
    className = "",
    isPreviewMode
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                onImageChange(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        onImageChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (isPreviewMode) {
        return imageUrl ? (
            <img
                src={imageUrl}
                alt="Profile"
                className={`${className} object-cover`}
            />
        ) : (
            <div className={`${className} bg-gray-200 flex items-center justify-center`}>
                <span className="text-gray-400 text-xs">No Image</span>
            </div>
        );
    }

    return (
        <div className={`${className} relative group`}>
            {imageUrl ? (
                <>
                    <img
                        src={imageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                            >
                                Change
                            </button>
                            <button
                                onClick={removeImage}
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full bg-gray-200 border-2 border-dashed border-blue-300 hover:border-blue-500 flex items-center justify-center cursor-pointer transition-colors"
                >
                    <div className="text-center">
                        <div className="text-blue-500 mb-1">📷</div>
                        <span className="text-xs text-gray-600">Add Photo</span>
                    </div>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />
        </div>
    );
};

export default ImageUpload;