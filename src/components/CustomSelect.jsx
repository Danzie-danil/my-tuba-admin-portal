import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ value, onChange, options = [], style, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const safeOptions = Array.isArray(options) ? options : [];
    const selectedOption = safeOptions.find(opt => opt.value === value) || safeOptions[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
    };

    return (
        <div
            className={`custom-select-container ${className || ''}`}
            ref={containerRef}
            style={{ position: 'relative', width: '100%', ...style }}
        >
            <div
                className={`input-select ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingRight: '40px'
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? selectedOption.label : 'Select...'}
                </span>
            </div>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {safeOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
