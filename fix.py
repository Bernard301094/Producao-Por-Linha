import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Remove login states
content = re.sub(r'^\s*const \[loginProfile, setLoginProfile\] = useState<string \| null>\(null\);\s*\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*const \[selectedProfile, setSelectedProfile\] = useState<string \| null>\(null\);\s*\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*const \[passwordInput, setPasswordInput\] = useState\(''\);\s*\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*const \[showPassword, setShowPassword\] = useState\(false\);\s*\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*const \[loginLoading, setLoginLoading\] = useState\(false\);\s*\n', '', content, flags=re.MULTILINE)

# 2. Update schema and defaultValues
content = content.replace(
    "horaInicial: z.string().min(1, 'Obrigatório'),\n});",
    "horaInicial: z.string().min(1, 'Obrigatório'),\n  operador: z.string().min(1, 'Obrigatório'),\n});"
)
content = content.replace(
    "defaultValues: { opNumber: '', produto: '', linha: localStorage.getItem('v-ops-default-linha') || '', turno: '', horaInicial: '' }",
    "defaultValues: { opNumber: '', produto: '', linha: localStorage.getItem('v-ops-default-linha') || '', turno: '', horaInicial: '', operador: localStorage.getItem('v-ops-default-operador') || '' }"
)

content = content.replace(
    "const watchLinha = watch('linha');",
    "const watchLinha = watch('linha');\n  const watchOperador = watch('operador');\n\n  useEffect(() => {\n    if (watchOperador) {\n      localStorage.setItem('v-ops-default-operador', watchOperador);\n    }\n  }, [watchOperador]);"
)

# 3. Fix currentTurnForView
content = re.sub(
    r"const currentTurnForView = loginProfile\s*\?\s*loginProfile\.replace\('Turno ', ''\)\s*:\s*getSuggestedShift\(new Date\(\), format\(new Date\(\), 'HH:mm'\)\);",
    "const currentTurnForView = getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));",
    content
)

# 4. Remove useEffect
content = re.sub(
    r"^\s*useEffect\(\(\) => \{\s*const storedProfile = localStorage\.getItem\('loginProfile'\);\s*if \(storedProfile\) \{\s*setLoginProfile\(storedProfile\);\s*setValue\('turno', storedProfile\.replace\('Turno ', ''\)\);\s*\}\s*\}, \[setValue\]\);\s*\n",
    "",
    content,
    flags=re.MULTILINE
)

content = re.sub(
    r"if \(!loginProfile\) \{\s*setValue\('turno', getSuggestedShift\(new Date\(\), watchHoraInicial\)\);\s*\} else \{\s*setValue\('turno', loginProfile\.replace\('Turno ', ''\)\);\s*\}",
    "setValue('turno', getSuggestedShift(new Date(), watchHoraInicial));",
    content
)

# 5. Remove LoginScreen and Modals
content = re.sub(r"import \{ LoginScreen \} from '\./components/LoginScreen/LoginScreen';\n", "", content)
content = re.sub(r"import \{ ChangePasswordModal \} from '\./components/ChangePasswordModal/ChangePasswordModal';\n", "", content)
content = re.sub(r"import \{ signInToFirebase, signOutFromFirebase, reauthenticateCurrentUser, verifySupervisorPassword \} from '\./api';\n", "", content)

# Remove the whole if (!loginProfile) block
content = re.sub(r"// ─── Tela de Login ────────────────────────────────────────────────────────\s*if \(!loginProfile\) \{[\s\S]*?\}\n\s*const today", "const today", content)

content = re.sub(r"const handleLogin = async \(\) => \{[\s\S]*?setLoginLoading\(false\);\s*\};\s*\n\s*\n", "", content)
content = re.sub(r"const handleChangePassword = async \(\) => \{[\s\S]*?setChangePasswordLoading\(false\);\s*\}\s*\};\s*\n\s*\n", "", content)
content = re.sub(r"const handleLogout = async \(\) => \{[\s\S]*?console\.error\);\s*\};\s*\n", "", content)

content = re.sub(r"const requireSupervisorOverride = \(action: \(\) => void\) => \{[\s\S]*?setOverrideModalOpen\(true\);\s*\};\s*\n\s*\n", "", content)
content = re.sub(r"const handleSupervisorOverride = async \(\) => \{[\s\S]*?setOverrideModalOpen\(false\);\s*\}\s*\};\s*\n", "", content)
content = re.sub(r"const \[overrideModalOpen, setOverrideModalOpen\] = useState\(false\);\n\s*const \[overridePassword, setOverridePassword\] = useState\(''\);\n\s*const \[overrideReason, setOverrideReason\] = useState\(''\);\n\s*const \[pendingOverrideAction, setPendingOverrideAction\] = useState<\(\) => void \| null>\(null\);\n", "", content)

# 6. Replace requireSupervisorOverride usage
content = re.sub(r"requireSupervisorOverride\(\(\) => \{\s*(.*?)\s*\}\);", r"\1", content, flags=re.DOTALL)
content = re.sub(r"requireSupervisorOverride\((.*?)\);", r"\1();", content)

# 7. Replace loginProfile
content = content.replace("loginProfile || 'UNKNOWN'", "currentTurnForView ? `Turno ${currentTurnForView}` : 'UNKNOWN'")
content = content.replace("isShiftAllowed(loginProfile)", "isShiftAllowed(`Turno ${currentTurnForView}`)")
content = content.replace("loginProfile ? loginProfile.replace('Turno ', '') : data.turno", "data.turno")

# Remove props
content = re.sub(r"\s*loginProfile=\{loginProfile!?\}", "", content)
content = re.sub(r"\s*handleChangePassword=\{handleChangePassword\}", "", content)
content = re.sub(r"<ToleranceCountdown[\s\S]*?/>", "", content)
content = re.sub(r"<ChangePasswordModal[\s\S]*?/>", "", content)

# Override modal rendering
content = re.sub(r"\{overrideModalOpen && \([\s\S]*?\}\)\}", "", content)

# Buttons
content = re.sub(r'<button[^>]*title="Alterar Senha"[^>]*>[\s\S]*?</button>', '', content)
content = re.sub(r'<button[^>]*title="Sair da Conta"[^>]*>[\s\S]*?</button>', '', content)
content = content.replace('<div className="w-px h-4 bg-white/20 shrink-0" />', '')
content = re.sub(r'<div className="flex items-center gap-1\.5 px-3 py-1\.5 bg-white/10 rounded-lg text-white font-medium text-sm border border-white/10 shadow-sm">\s*\{loginProfile\}\s*</div>', '', content)
content = re.sub(r'<div className="hidden lg:flex items-center gap-3 px-3 py-1\.5 bg-zinc-100 rounded-xl border border-zinc-200/80 shadow-sm">\s*<div className="flex items-center gap-2">\s*<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />\s*<span className="text-sm font-bold text-zinc-700">\{loginProfile\}</span>\s*</div>\s*</div>', '', content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Done Python replace.")
