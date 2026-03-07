import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const MobileLayout = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-300 via-amber-200 to-orange-200 pb-28">
            <div className="mx-auto min-h-screen w-full max-w-md bg-slate-950/85 px-4 pb-28 pt-5 text-slate-100 shadow-2xl backdrop-blur-xl md:max-w-none md:px-6 lg:px-8">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
};

export default MobileLayout;
