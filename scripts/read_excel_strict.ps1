param(
    [Parameter(Mandatory = $true)]
    [string]$ExcelPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$lowerOAcute = [char]0x00F3
$upperOAcute = [char]0x00D3

$studentHeaderVariants = @(
    @("C${lowerOAcute}digo", "Nombre", "Materia", "Profesor(a)", "Grupo"),
    @("C${lowerOAcute}digo", "Nombre", "Materia", "Profesor", "Grupo"),
    @("CODIGO", "NOMBRE", "MATERIA", "PROFESOR", "GRUPO")
)
$legacyRegistroHeaders = @(
    "FECHA",
    "C${upperOAcute}DIGO",
    "NOMBRE",
    "MATERIA",
    "PROFESOR",
    "GRUPO",
    "TIPO DE REGISTRO",
    "LAPTOP",
    "OBSERVACIONES"
)
$groupHeaderVariants = @(
    @("Grupo", "Turno", "Ciclo escolar"),
    @("GRUPO", "TURNO", "CICLO ESCOLAR")
)

function Read-CellText {
    param(
        $Sheet,
        [int]$Row,
        [int]$Column
    )

    return ([string]$Sheet.Cells.Item($Row, $Column).Text).Trim()
}

function Get-WorksheetOrNull {
    param(
        $Workbook,
        [string]$Name
    )

    try {
        return $Workbook.Worksheets.Item($Name)
    }
    catch {
        return $null
    }
}

function Normalize-Header {
    param([string]$Value)

    if ($null -eq $Value) {
        $Value = ""
    }

    $normalized = $Value.Trim().ToUpperInvariant().Normalize([Text.NormalizationForm]::FormD)
    $builder = New-Object System.Text.StringBuilder
    foreach ($char in $normalized.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($char)
        }
    }
    return $builder.ToString()
}

function Test-Headers {
    param(
        $Sheet,
        [string[]]$ExpectedHeaders
    )

    if (-not $Sheet) {
        return $false
    }

    $actualHeaders = @()
    for ($index = 0; $index -lt $ExpectedHeaders.Count; $index++) {
        $actualHeaders += Read-CellText -Sheet $Sheet -Row 1 -Column ($index + 1)
    }

    $actualJoined = ($actualHeaders | ForEach-Object { Normalize-Header $_ }) -join "|"
    $expectedJoined = ($ExpectedHeaders | ForEach-Object { Normalize-Header $_ }) -join "|"
    return ($actualJoined -eq $expectedJoined)
}

function Test-HeadersAgainstVariants {
    param(
        $Sheet,
        [object[]]$HeaderVariants
    )

    foreach ($variant in $HeaderVariants) {
        if (Test-Headers -Sheet $Sheet -ExpectedHeaders $variant) {
            return $true
        }
    }

    return $false
}

function Assert-Headers {
    param(
        $Sheet,
        [string[]]$ExpectedHeaders,
        [string]$SheetName
    )

    if (-not (Test-Headers -Sheet $Sheet -ExpectedHeaders $ExpectedHeaders)) {
        throw "La hoja '$SheetName' no tiene el formato correcto. Verifique los nombres y el orden de las columnas."
    }
}

function Assert-HeadersAgainstVariants {
    param(
        $Sheet,
        [object[]]$HeaderVariants,
        [string]$SheetName
    )

    if (-not (Test-HeadersAgainstVariants -Sheet $Sheet -HeaderVariants $HeaderVariants)) {
        throw "La hoja '$SheetName' no tiene el formato correcto. Verifique los nombres y el orden de las columnas."
    }
}

function Read-StudentRows {
    param($Sheet)

    $usedRange = $Sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $rows = @()

    for ($row = 2; $row -le $rowCount; $row++) {
        $codigo = Read-CellText -Sheet $Sheet -Row $row -Column 1
        $nombre = Read-CellText -Sheet $Sheet -Row $row -Column 2
        $materia = Read-CellText -Sheet $Sheet -Row $row -Column 3
        $profesor = Read-CellText -Sheet $Sheet -Row $row -Column 4
        $grupo = Read-CellText -Sheet $Sheet -Row $row -Column 5

        if ([string]::IsNullOrWhiteSpace($codigo) -and [string]::IsNullOrWhiteSpace($nombre) -and [string]::IsNullOrWhiteSpace($materia) -and [string]::IsNullOrWhiteSpace($profesor) -and [string]::IsNullOrWhiteSpace($grupo)) {
            continue
        }

        $rows += [pscustomobject]@{
            "Codigo" = $codigo
            "Nombre" = $nombre
            "Materia" = $materia
            "Profesor" = $profesor
            "Grupo" = $grupo
        }
    }

    return $rows
}

function Read-GroupRows {
    param($Sheet)

    $usedRange = $Sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $rows = @()

    for ($row = 2; $row -le $rowCount; $row++) {
        $grupo = Read-CellText -Sheet $Sheet -Row $row -Column 1
        $turno = Read-CellText -Sheet $Sheet -Row $row -Column 2
        $cicloEscolar = Read-CellText -Sheet $Sheet -Row $row -Column 3

        if ([string]::IsNullOrWhiteSpace($grupo) -and [string]::IsNullOrWhiteSpace($turno) -and [string]::IsNullOrWhiteSpace($cicloEscolar)) {
            continue
        }

        $rows += [pscustomobject]@{
            "Grupo" = $grupo
            "Turno" = $turno
            "CicloEscolar" = $cicloEscolar
        }
    }

    return $rows
}

$excel = $null
$workbook = $null

try {
    $resolvedPath = (Resolve-Path -LiteralPath $ExcelPath).Path
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($resolvedPath)

    $alumnosSheet = Get-WorksheetOrNull -Workbook $workbook -Name "ALUMNOS"
    $gruposSheet = Get-WorksheetOrNull -Workbook $workbook -Name "GRUPOS"
    $registroSheet = Get-WorksheetOrNull -Workbook $workbook -Name "REGISTRO"

    $validatedSheets = @()
    $students = @()
    $groups = @()
    $format = ""

    $hasLegacyStudentSheet = $gruposSheet -and (Test-HeadersAgainstVariants -Sheet $gruposSheet -HeaderVariants $studentHeaderVariants)
    $hasGroupSheet = $gruposSheet -and (Test-HeadersAgainstVariants -Sheet $gruposSheet -HeaderVariants $groupHeaderVariants)

    if ($registroSheet -and -not $hasLegacyStudentSheet) {
        throw "La hoja 'REGISTRO' solo se admite junto con una hoja 'GRUPOS' en formato legado."
    }

    if ($alumnosSheet) {
        Assert-HeadersAgainstVariants -Sheet $alumnosSheet -HeaderVariants $studentHeaderVariants -SheetName "ALUMNOS"
        $students = @(Read-StudentRows -Sheet $alumnosSheet)
        $validatedSheets += "ALUMNOS"
        $format = "separado"
    }
    elseif ($hasLegacyStudentSheet) {
        Assert-HeadersAgainstVariants -Sheet $gruposSheet -HeaderVariants $studentHeaderVariants -SheetName "GRUPOS"
        $students = @(Read-StudentRows -Sheet $gruposSheet)
        $validatedSheets += "GRUPOS"
        $format = "legado"
    }

    if ($hasGroupSheet) {
        Assert-HeadersAgainstVariants -Sheet $gruposSheet -HeaderVariants $groupHeaderVariants -SheetName "GRUPOS"
        $groups = @(Read-GroupRows -Sheet $gruposSheet)
        $validatedSheets += "GRUPOS"
        if (-not $format) {
            $format = "separado"
        }
    }

    if ($registroSheet) {
        Assert-Headers -Sheet $registroSheet -ExpectedHeaders $legacyRegistroHeaders -SheetName "REGISTRO"
        $validatedSheets += "REGISTRO"
    }

    if ($validatedSheets.Count -eq 0) {
        throw "El archivo debe contener una hoja 'ALUMNOS', una hoja 'GRUPOS' compatible o el formato legado 'GRUPOS' + 'REGISTRO'."
    }

    [pscustomobject]@{
        validatedSheets = $validatedSheets
        format = $format
        students = $students
        groups = $groups
    } | ConvertTo-Json -Depth 5 -Compress
}
finally {
    if ($workbook) { $workbook.Close($false) }
    if ($excel) { $excel.Quit() }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
