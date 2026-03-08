import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const MobileLayout = () => {
    return (
        <div className="min-h-screen bg-slate-950 pb-28">
            <div className="mx-auto min-h-screen w-full max-w-md border-x border-slate-800/60 bg-slate-950 px-4 pb-28 pt-5 text-slate-100 md:max-w-none md:px-6 lg:px-8">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
};

export default MobileLayout;
