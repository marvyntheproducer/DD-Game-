// Game adapter for Ange Yaghi's MIT Engine Simulator combustion/gas core.
// Crank speed comes from the game's drivetrain; no duplicate vehicle solver.
#include "vendor/include/engine.h"
#include "vendor/include/standard_valvetrain.h"
#include "vendor/include/direct_throttle_linkage.h"
#include "vendor/include/delay_filter.h"
#include "vendor/include/low_pass_filter.h"
#include "vendor/include/leveling_filter.h"
#include <algorithm>
#include <cmath>
#include <memory>

namespace {
constexpr double Pi=3.14159265358979323846, Atm=101325, Hz=16000, Dt=1/Hz;
constexpr int Block=2048;
const int Order[6]={0,4,2,5,1,3}; // 1-5-3-6-2-4, mapped to physical cylinders.
const double Phases[6]={0,480,240,600,120,360};
double bounded(double v,double lo,double hi){return std::isfinite(v)?std::clamp(v,lo,hi):lo;}
void harmonic(Function &f,double lift){
    const double k=std::acos(std::pow(2*.00127/lift,1/1.1)-1)/(220*Pi/180/4);
    const double extent=Pi/k,step=extent/95;
    f.initialize(199,step);f.addSample(0,lift);
    for(int i=1;i<100;i++){const double x=i*step,y=x>=extent?0:lift*std::pow(.5+.5*std::cos(k*x),1.1);f.addSample(-x,y);f.addSample(x,y);}
}
struct LiveEngine {
    Engine engine; DirectThrottleLinkage throttle;
    Function inLobe,outLobe,inFlow,outFlow,timing,turbulence,flame;
    Camshaft inCam,outCam; StandardValvetrain valves;
    DelayFilter delay[6]; LowPassFilter dc,low; LevelingFilter level;
    double angle=0,rpm=950,targetRpm=950,targetThrottle=0,targetBoost=0,targetLoad=0;
    double throttleValue=0,boost=0,clock=0,nextTick=0,last=0,current=0,peakPressure=0,burned=0;
    int fuelCut=0; unsigned long ticks=0,ignitions=0,faults=0;
    float output[Block];
    LiveEngine(){
        DirectThrottleLinkage::Parameters tp{};tp.gamma=1;throttle.initialize(tp);
        Engine::Parameters ep{};ep.name="DD live 2JZ I6";ep.cylinderBanks=1;ep.cylinderCount=6;ep.crankshaftCount=1;ep.exhaustSystemCount=2;ep.intakeCount=1;ep.throttle=&throttle;
        ep.redline=units::rpm(10000);ep.initialSimulationFrequency=Hz;engine.initialize(ep);
        auto crank=engine.getCrankshaft(0);
        Crankshaft::Parameters cp{};cp.mass=15;cp.flywheelMass=10;cp.momentOfInertia=.3;cp.crankThrow=.043;cp.rodJournals=6;cp.tdc=Pi/2;crank->initialize(cp);
        for(int i=0;i<6;i++)crank->setRodJournalAngle(i,Phases[i]*Pi/180);
        CylinderBank::Parameters bp{};bp.crankshaft=crank;bp.bore=.086;bp.deckHeight=.043+.142+.0328;bp.cylinderCount=6;bp.index=0;engine.getCylinderBank(0)->initialize(bp);
        harmonic(inLobe,.00978);harmonic(outLobe,.00960);
        Camshaft::Parameters cap{};cap.lobes=6;cap.crankshaft=crank;cap.baseRadius=.017;cap.lobeProfile=&inLobe;inCam.initialize(cap);cap.lobeProfile=&outLobe;outCam.initialize(cap);
        for(int i=0;i<6;i++){inCam.setLobeCenterline(i,(360+116+Phases[i])*Pi/180);outCam.setLobeCenterline(i,(360-116+Phases[i])*Pi/180);}
        StandardValvetrain::Parameters vp{};vp.intakeCamshaft=&inCam;vp.exhaustCamshaft=&outCam;valves.initialize(vp);
        const double ins[]={0,58,103,156,214,249,268,280,280,281},outs[]={0,37,72,113,160,196,222,235,245,246};
        inFlow.initialize(10,.00127);outFlow.initialize(10,.00127);
        for(int i=0;i<10;i++){inFlow.addSample(i*.00127,GasSystem::k_28inH2O(ins[i]*.9));outFlow.addSample(i*.00127,GasSystem::k_28inH2O(outs[i]*.9));}
        auto head=engine.getHead(0);CylinderHead::Parameters hp{};hp.Bank=engine.getCylinderBank(0);hp.ExhaustPortFlow=&outFlow;hp.IntakePortFlow=&inFlow;hp.Valvetrain=&valves;hp.CombustionChamberVolume=.000050;hp.IntakeRunnerVolume=.0001496;hp.IntakeRunnerCrossSectionArea=std::pow(1.9*.0254,2);hp.ExhaustRunnerVolume=.000050;hp.ExhaustRunnerCrossSectionArea=std::pow(1.25*.0254,2);head->initialize(hp);
        Intake::Parameters ip{};ip.volume=.001;ip.CrossSectionArea=.001;ip.InputFlowK=GasSystem::k_carb(500);ip.IdleFlowK=0;ip.RunnerFlowRate=GasSystem::k_carb(200);ip.RunnerLength=1.016;ip.IdleThrottlePlatePosition=.9965;engine.getIntake(0)->initialize(ip);head->setAllIntakes(engine.getIntake(0));
        ExhaustSystem::Parameters xp{};xp.length=2.54;xp.collectorCrossSectionArea=.004;xp.outletFlowRate=GasSystem::k_carb(1000);xp.primaryTubeLength=1.016;xp.primaryFlowRate=GasSystem::k_carb(400);xp.velocityDecay=1;xp.audioVolume=.2;xp.impulseResponse=nullptr;
        for(int i=0;i<2;i++)engine.getExhaustSystem(i)->initialize(xp);
        for(int i=0;i<6;i++){head->setExhaustSystem(i,engine.getExhaustSystem(i<3?0:1));head->setSoundAttenuation(i,.94);head->setHeaderPrimaryLength(i,.0127*(i<3?5-i:i));}
        turbulence.initialize(30,1);for(int i=0;i<30;i++)turbulence.addSample(i,i*.5);
        flame.initialize(10,5);for(int i=0;i<10;i++)flame.addSample(i*5,i==0?3:i*7.5);
        Fuel::Parameters fp{};fp.turbulenceToFlameSpeedRatio=&flame;fp.maxBurningEfficiency=1;fp.burningEfficiencyRandomness=.08;fp.maxDilutionEffect=10;engine.getFuel()->initialize(fp);
        timing.initialize(8,units::rpm(1000));const double adv[]={12,12,20,26,30,34,38,38};for(int i=0;i<8;i++)timing.addSample(units::rpm(i*1000),adv[i]*Pi/180);
        IgnitionModule::Parameters gp{};gp.cylinderCount=6;gp.crankshaft=crank;gp.timingCurve=&timing;gp.revLimit=units::rpm(10000);gp.limiterDuration=.035;engine.getIgnitionModule()->initialize(gp);
        for(int i=0;i<6;i++)engine.getIgnitionModule()->setFiringOrder(Order[i],i*4*Pi/6);
        for(int i=0;i<6;i++){
            ConnectingRod::Parameters rp{};rp.mass=.5;rp.momentOfInertia=.001;rp.length=.142;rp.piston=engine.getPiston(i);rp.crankshaft=crank;rp.journal=i;engine.getConnectingRod(i)->initialize(rp);
            Piston::Parameters pp{};pp.Rod=engine.getConnectingRod(i);pp.Bank=engine.getCylinderBank(0);pp.CylinderIndex=i;pp.CompressionHeight=.0328;pp.mass=.25;pp.BlowbyFlowCoefficient=GasSystem::k_28inH2O(.05);engine.getPiston(i)->initialize(pp);
        }
        positionPistons();
        for(int i=0;i<6;i++){
            auto ch=engine.getChamber(i);CombustionChamber::Parameters cc{};cc.Piston=engine.getPiston(i);cc.Head=head;cc.Fuel=engine.getFuel();cc.MeanPistonSpeedToTurbulence=&turbulence;cc.CrankcasePressure=Atm;ch->initialize(cc);
            GasSystem::Mix mix;mix.p_fuel=.02;mix.p_o2=.245;mix.p_inert=.735;ch->m_system.initialize(Atm,ch->getVolume(),298.15,mix);
            delay[i].initialize((1.016+head->getHeaderPrimaryLength(i))/343,Hz);
        }
        engine.getIgnitionModule()->m_enabled=true;engine.getIgnitionModule()->reset();
        dc.m_dt=Dt;dc.setCutoffFrequency(12);low.m_dt=Dt;low.setCutoffFrequency(6500);level.p_target=.22;level.p_maxLevel=.0002;level.p_minLevel=0;
    }
    ~LiveEngine(){engine.destroy();inCam.destroy();outCam.destroy();for(auto f:{&inLobe,&outLobe,&inFlow,&outFlow,&timing,&turbulence,&flame})f->destroy();}
    void positionPistons(){
        auto crank=engine.getCrankshaft(0);crank->m_body.theta=Pi/2-angle;crank->m_body.v_theta=-rpm*2*Pi/60;
        for(int i=0;i<6;i++){
            const double a=angle-Phases[i]*Pi/180,s=std::sin(a),c=std::cos(a),h=std::sqrt(.142*.142-.043*.043*s*s);
            auto p=engine.getPiston(i);p->m_body.p_y=.043*c+h;p->m_body.v_y=(-.043*s-.043*.043*s*c/h)*rpm*2*Pi/60;
        }
    }
    double tick(){
        rpm+=(targetRpm-rpm)*(1-std::exp(-Dt*24));throttleValue+=(targetThrottle-throttleValue)*(1-std::exp(-Dt*35));boost+=(targetBoost-boost)*(1-std::exp(-Dt*12));
        angle=std::fmod(angle+rpm*2*Pi/60*Dt,4*Pi);positionPistons();
        auto intake=engine.getIntake(0);intake->m_throttle=1-(.025+.975*throttleValue);intake->supplyPressure=Atm+boost*6894.757*(.25+.75*targetLoad);
        auto ignition=engine.getIgnitionModule();ignition->m_enabled=!fuelCut;ignition->update(Dt);
        for(int i=0;i<6;i++){auto ch=engine.getChamber(i);ch->update(Dt);if(ignition->getIgnitionEvent(i)){ch->ignite();if(ch->isLit())ignitions++;}}
        ignition->resetIgnitionEvents();
        // Same gas-flow/combustion equations as upstream, with two fluid substeps.
        for(int sub=0;sub<2;sub++){intake->process(Dt/2);for(int i=0;i<2;i++)engine.getExhaustSystem(i)->process(Dt/2);for(int i=0;i<6;i++)engine.getChamber(i)->flow(Dt/2);}
        double signal=0;
        for(int i=0;i<6;i++){
            auto ch=engine.getChamber(i);auto &gas=ch->m_exhaustRunnerAndPrimary;
            const double pressure=gas.pressure(),len=2.54+engine.getHead(0)->getHeaderPrimaryLength(i);
            // Upstream PistonEngineSimulator::writeToSynthesizer pressure path.
            const double pulse=1600*((pressure-Atm)+.1*gas.dynamicPressure(1,0)+.1*gas.dynamicPressure(-1,0));
            signal+=.94*.2*delay[i].fast_f(pulse)/(6*len*len);
            peakPressure=std::max(peakPressure,ch->m_system.pressure());burned+=ch->m_nBurntFuel;ch->m_nBurntFuel=0;
        }
        ticks++;
        if(!std::isfinite(signal)){faults++;return 0;}
        const float filtered=low.fast_f(signal-dc.fast_f(signal));
        return level.f(filtered);
    }
    void render(int count,double sampleRate){
        const double outDt=1/sampleRate;
        for(int i=0;i<count;i++){
            while(nextTick<=clock){last=current;current=tick();nextTick+=Dt;}
            const double f=bounded((clock-(nextTick-Dt))/Dt,0,1);
            output[i]=static_cast<float>(std::clamp(last+(current-last)*f,-.9,.9));clock+=outDt;
        }
    }
};
std::unique_ptr<LiveEngine> engines[2];
}
extern "C" {
int dd_init(int slot){if(slot<0||slot>1)return 0;if(!engines[slot])engines[slot]=std::make_unique<LiveEngine>();return 1;}
void dd_destroy(int slot){if(slot>=0&&slot<2)engines[slot].reset();}
void dd_state(int slot,double rpm,double throttle,double load,double boost,int cut){if(slot<0||slot>1||!engines[slot])return;auto &e=*engines[slot];e.targetRpm=bounded(rpm,650,10000);e.targetThrottle=bounded(throttle,0,1);e.targetLoad=bounded(load,0,1);e.targetBoost=bounded(boost,0,30)*e.targetThrottle;e.fuelCut=cut!=0;}
float *dd_render(int slot,int frames,double rate){if(slot<0||slot>1||!engines[slot]||frames<0||frames>Block||!std::isfinite(rate)||rate<8000||rate>96000)return nullptr;engines[slot]->render(frames,rate);return engines[slot]->output;}
double dd_metric(int slot,int metric){if(slot<0||slot>1||!engines[slot])return 0;auto &e=*engines[slot];switch(metric){case 0:return e.rpm;case 1:return e.ticks;case 2:return e.ignitions;case 3:return e.burned;case 4:return e.peakPressure;case 5:return e.faults;}return 0;}
}
