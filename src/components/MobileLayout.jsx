import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const MobileLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50 pb-28">
            <div className="bg-white mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-5 text-slate-800 shadow-xl md:max-w-none md:px-6 lg:px-8 border-x border-slate-100">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
};

export default MobileLayout;
