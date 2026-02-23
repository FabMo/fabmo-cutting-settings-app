document.addEventListener("DOMContentLoaded", function () {
    const navLinks = document.querySelectorAll("nav ul.left li a");
    const tabContents = document.querySelectorAll(".tabs-content .content");

    navLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            navLinks.forEach(item => item.parentElement.classList.remove("active"));
            tabContents.forEach(content => content.style.display = "none");
            this.parentElement.classList.add("active");
            const targetId = this.getAttribute("href").substring(1);
            document.getElementById(targetId).style.display = "block";
        });
    });

    document.querySelector("nav ul.left li.active a").click();
});

var fabmo = new FabMoDashboard();

var variables = {};

// Unit index: 0 = inch, 1 = mm  (equivalent to %(25) in OpenSBP)
var unitIndex = 0;
// Number of decimal places for display, from opensbp.variable_precision
var displayPrecision = 5;

// Track machine state so we can refresh displayed values whenever the machine
// returns to idle (e.g. after a tool change, measure, or any macro).
var lastMachineState = null;

fabmo.on('status', function (status) {
    var currentState = status.state;
    // Refresh when machine transitions TO idle from any other state
    if (currentState === 'idle' && lastMachineState && lastMachineState !== 'idle') {
        updateStatus();
    }
    lastMachineState = currentState;
});


/**
 * Determine the current unit index from config data.
 * Returns 0 for inches, 1 for mm.
 * Tries multiple known locations in the FabMo config tree.
 */
function getUnitIndex(data) {
    // ── DEBUG: dump config keys so we can find the units field ──
    // if (data.opensbp) {
    //     var sbpKeys = Object.keys(data.opensbp).filter(function(k) { return k !== 'variables'; });
    //     console.log('[UU-DEBUG] opensbp config keys (excluding variables):', sbpKeys);
    //     sbpKeys.forEach(function(k) {
    //         var v = data.opensbp[k];
    //         if (typeof v !== 'object') {
    //             console.log('[UU-DEBUG]   opensbp.' + k + ' =', v);
    //         }
    //     });
    // }
    // if (data.driver) {
    //     console.log('[UU-DEBUG] driver config keys:', Object.keys(data.driver));
    //     if (data.driver['1']) {
    //         console.log('[UU-DEBUG]   driver[1] keys:', Object.keys(data.driver['1']));
    //         console.log('[UU-DEBUG]   driver[1].gun =', data.driver['1'].gun);
    //     }
    //     if (data.driver.gun !== undefined) {
    //         console.log('[UU-DEBUG]   driver.gun =', data.driver.gun);
    //     }
    // }
    // if (data.machine) {
    //     console.log('[UU-DEBUG] machine config keys:', Object.keys(data.machine));
    // }

    // ── 1. OpenSBP config: check common field names ──
    if (data.opensbp) {
        var u = data.opensbp.units;
        if (u !== undefined) {
            // console.log('[UU-DEBUG] Found opensbp.units =', u);
            if (u === 'mm' || u === 1 || u === '1') return 1;
            if (u === 'in' || u === 0 || u === '0') return 0;
        }
        // Some FabMo versions might use 'unit' (singular)
        u = data.opensbp.unit;
        if (u !== undefined) {
            // console.log('[UU-DEBUG] Found opensbp.unit =', u);
            if (u === 'mm' || u === 1 || u === '1') return 1;
            if (u === 'in' || u === 0 || u === '0') return 0;
        }
    }

    // ── 2. Driver config: G2 gun setting (group 1) ──
    if (data.driver) {
        var gun;
        if (data.driver['1'] && data.driver['1'].gun !== undefined) {
            gun = data.driver['1'].gun;
        } else if (data.driver.gun !== undefined) {
            gun = data.driver.gun;
        }
        if (gun !== undefined) {
            // console.log('[UU-DEBUG] Found driver gun =', gun);
            if (gun === 1) return 1;
            if (gun === 0) return 0;
        }
    }

    // ── 3. Machine config ──
    if (data.machine) {
        var mu = data.machine.units;
        if (mu !== undefined) {
            // console.log('[UU-DEBUG] Found machine.units =', mu);
            if (mu === 'mm' || mu === 1) return 1;
            if (mu === 'in' || mu === 0) return 0;
        }
    }

    // console.warn('[UU-DEBUG] Could not determine unit index from config — defaulting to 0 (inches).');
    // console.warn('[UU-DEBUG] Check the [UU-DEBUG] logs above to identify where the unit setting lives.');
    return 0;
}

updateStoredConfig(function (data) {
    unitIndex = getUnitIndex(data);
    // console.log('[UU-DEBUG] unitIndex resolved to:', unitIndex);
    var variables = data.opensbp.variables;
    // console.log(variables);
    populateToolLibrary();
    updateStatus();
    console.log("Machine Profile is " + data.engine.profile);
    var machineType = data.engine.profile;
    if (machineType == 'ShopBot Desktop ATC') {
        document.getElementById('atcSetup').removeAttribute('hidden');
        document.getElementById('atcChangeSettings').removeAttribute('hidden');
    }
    if (machineType == 'ShopBot Desktop' || machineType == 'ShopBot Desktop Max') {
        document.getElementById('mtcChangeSettings').removeAttribute('hidden');
    }
    var imageDir = './files/' + machineType + '.jpg';
    // console.log(imageDir);
    $('#machineImage1').attr('src', imageDir);
    $('#machineImage2').attr('src', imageDir);

    // Initialize any missing variables
    var variableInitCode = '';
    if (!variables['SB_USEZZEROLOC'] && variables['SB_USEZZEROLOC'] !== 0) {
        variableInitCode += '$sb_useZZeroLoc = 0 \n ';
    }
    if (!variables['SB_ZZEROLOCX'] && variables['SB_ZZEROLOCX'] !== 0) {
        variableInitCode += '$sb_zZeroLocX = 0 \n ';
    }
    if (!variables['SB_ZZEROLOCY'] && variables['SB_ZZEROLOCY'] !== 0) {
        variableInitCode += '$sb_zZeroLocY = 0 \n ';
    }
    if (!variables['SB_HOMEOFFUU']) {
        variableInitCode += 'C201 \n ';
    }
    if (variableInitCode != '') {
        fabmo.runSBP(variableInitCode);
    }
});

function updateStoredConfig(callback) {
    fabmo.getConfig(function (err, data) {
        if (err) {
            console.error(err);
        } else {
            unitIndex = getUnitIndex(data);

            // Read variable_precision from opensbp config
            if (data.opensbp && data.opensbp.variable_precision !== undefined) {
                displayPrecision = parseInt(data.opensbp.variable_precision, 10);
                if (isNaN(displayPrecision) || displayPrecision < 0) {
                    displayPrecision = 5;
                }
            }
            // console.log('[UU-DEBUG] displayPrecision:', displayPrecision);

            $('[data-address]').each(function () {
                const $el = $(this);
                const address = $el.data('address');
                const isUU = $el.data('uu');

                var value;
                if (isUU) {
                    var uuProp = $el.data('uu-prop');
                    var uuPath = address + '.' + unitIndex;
                    if (uuProp) {
                        uuPath += '.' + uuProp;
                    }
                    // console.log('[UU-READ] ' + address + ' → path: ' + uuPath);
                    value = getValueByAddress(data, uuPath);
                    // console.log('[UU-READ]   value:', value);
                } else {
                    value = getValueByAddress(data, address);
                }

                if (value !== undefined) {
                    // Round numeric values to displayPrecision decimal places
                    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(value) && value.trim() !== '')) {
                        value = parseFloat(parseFloat(value).toFixed(displayPrecision));
                    }
                    $el.val(value);
                }
            });
            // console.log('updated vars');
            callback(data);
        }
    });
}

function getValueByAddress(obj, address) {
    return address.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
}

function updateStatus() {
    updateStoredConfig(function (data) {
        var variables = data.opensbp.variables;
        if (variables['ATC'] && variables['ATC']['TOOLIN']) {
            var toolIn = variables['ATC']['TOOLIN'];
            var toolDescription = '';
            if (variables['TOOLS'] && variables['TOOLS'][toolIn] && variables['TOOLS'][toolIn]['NAME']) {
                toolDescription = variables['TOOLS'][toolIn]['NAME'];
            }
            if (!toolDescription) { toolDescription = ''; }
            var toolStatus = 'Tool Library - Current Bit: ' + toolIn + '; ' + toolDescription;
            $('#currentStatus').html(toolStatus);
        }
    });
}

function populateToolLibrary() {
    updateStoredConfig(function (data) {
        var variables = data.opensbp.variables;
        if (variables['TOOLSUU']) {
            $.each(variables['TOOLSUU'], function (toolNumber, toolUUData) {
                var toolName = '';
                if (variables['TOOLS'] && variables['TOOLS'][toolNumber] && variables['TOOLS'][toolNumber]['NAME']) {
                    toolName = variables['TOOLS'][toolNumber]['NAME'];
                }
                var safeValue = escapeHtmlAttr(toolName) || '';
                if (safeValue == '' || safeValue == 'undefined') { safeValue = 'Enter Tool Description...'; }
                if (toolNumber == 0) { safeValue = 'Empty'; }
                var row = `
    <tr>
        <td>${toolNumber}</td>
        <td><input class="tool-description" data-tool="${toolNumber}" type="text" value="${safeValue}"></td>
        <td><a class="button radius small tool-load" style="padding:10px" data-tool="${toolNumber}">Load</a></td>
        <td><a class="button radius small tool-measure" style="padding:10px" data-tool="${toolNumber}">Measure</a></td>
    </tr>
    `;
                $('#toolLibrary tbody').append(row);
            });
        } else {
            var row = `
        <tr>
            <td>0</td>
            <td><input class="tool-description" data-tool="0" type="text" value="Empty"></td>
            <td><a class="button radius small tool-load" style="padding:10px" data-tool="0">Load</a></td>
            <td><a class="button radius small tool-measure" style="padding:10px" data-tool="0">Measure</a></td>
        </tr>
        `;
            $('#toolLibrary tbody').append(row);
        }
    });
}

function escapeHtmlAttr(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

$('#toolLibrary').on('change', '.tool-description', function (e) {
    const $input = $(this);
    updateStoredConfig(function (data) {
        var variables = data.opensbp.variables;
        var toolNumber = $input.data('tool');
        var newDescription = escapeHtmlAttr($input.val());
        // console.log('$tools[' + toolNumber + '].NAME = ' + newDescription);
        if (newDescription != undefined) {
            if (newDescription.length > 0) {
                var sbp = '$tools[' + toolNumber + '].NAME = "' + newDescription + '" ';
                if (!variables['TOOLSUU'] || !variables['TOOLSUU'][toolNumber]) {
                    sbp += '\n $toolsUU[' + toolNumber + '][].h = -5.000';
                    sbp += '\n $toolsUU[' + toolNumber + '][].x = 0';
                    sbp += '\n $toolsUU[' + toolNumber + '][].y = 0';
                    sbp += '\n $toolsUU[' + toolNumber + '][].z = 0';
                }
                // console.log('[UU-WRITE] Tool SBP:', sbp);
                fabmo.runSBP(sbp);
                $input.addClass("flash-green");
                setTimeout(function () { $input.removeClass("flash-green"); }, 500);
                updateStatus();
            }
        } else {
            $input.addClass("flash-red");
            setTimeout(function () { $input.removeClass("flash-red"); }, 500);
        }
    });
});

$('#toolLibrary').on('click', '.tool-load', function () {
    var toolNumber = $(this).data('tool');
    // console.log('running &tool = ' + toolNumber + ' \n C9');
    fabmo.runSBP('&tool = ' + toolNumber + ' \n C9');
});

$('#toolLibrary').on('click', '.tool-measure', function () {
    var toolNumber = $(this).data('tool');
    // console.log('running &tool = ' + toolNumber + ' \n C72');
    fabmo.runSBP('&tool = ' + toolNumber + ' \n C72');
});

$('#addToolBtn').on('click', function () {
    $('#newToolNumber').val('');
    $('#toolPopupBar').slideDown();
    $('#newToolNumber').focus();
});

$('#cancelAddTool').on('click', function () {
    $('#toolPopupBar').slideUp();
});

$('#confirmAddTool').on('click', function () {
    const toolNumber = $('#newToolNumber').val().trim();
    // console.log('adding tool number ' + toolNumber);
    if (toolNumber === '' || isNaN(toolNumber)) {
        // console.log('tool number is NaN');
        alert('Please enter a valid tool number.');
        return;
    }

    if (variables.TOOLSUU && variables.TOOLSUU[toolNumber]) {
        // console.log('tool number already exists');
        alert('A tool with this number already exists!');
        return;
    }

    const newRow = `
    <tr>
      <td>${toolNumber}</td>
      <td><input class="tool-description" data-tool="${toolNumber}" type="text" value="Enter tool description..."></td>
      <td><a class="button radius small tool-load" style="padding:10px" data-tool="${toolNumber}">Load</a></td>
      <td><a class="button radius small tool-measure" style="padding:10px" data-tool="${toolNumber}">Measure</a></td>
    </tr>
  `;
    $('#toolLibrary tbody').append(newRow);
    // console.log('row appended');
    $('#toolPopupBar').slideUp();
});

// Watch all input and checkbox elements EXCEPT inside #toolLibrary
$('input, select, textarea').not('#toolLibrary *').on('change', function () {
    const $input = $(this);

    const address = $input.data('address') || '(no address)';
    const sbpWrite = $input.data('sbp-write');

    let value;
    if ($input.attr('type') === 'checkbox') {
        value = $input.prop('checked') ? 1 : 0;
    } else {
        value = $input.val();
    }
    $input.addClass("flash-green");
    setTimeout(() => $input.removeClass("flash-green"), 500);

    // Build SBP variable name
    var varname;
    if (sbpWrite) {
        varname = '$' + sbpWrite;
    } else {
        varname = '$' + address.split('.')[address.split('.').length - 1];
    }
    var sbp = varname + ' = ' + value;
    // console.log('[UU-WRITE] address:', address, 'sbpWrite:', sbpWrite, 'command:', sbp);

    fabmo.runSBP(sbp, function (err, result) {
        if (err) {
            console.error("SBP run failed:", err);
            fabmo.notify('error', 'Settings changes not allowed while machine is in motion.');
        } else {
            // console.log("[UU-WRITE] SBP run completed. Result:", result);
            fabmo.notify('success', varname + ' updated to ' + value);
        }
    });
});

$('#sb_useZZeroLoc').on('change', function (e) {
    if ($('#sb_useZZeroLoc').prop('checked')) {
        $('#sb_zZeroLocX').prop('disabled', false);
        $('#sb_zZeroLocY').prop('disabled', false);
    } else {
        $('#sb_zZeroLocX').prop('disabled', true);
        $('#sb_zZeroLocY').prop('disabled', true);
    }
});

$('#xOffset').on('change', function (e) {
    $('#xOffset').addClass("flash-green");
    setTimeout(function () { $('#xOffset').removeClass("flash-green"); }, 500);
});

$('#btn-HomeMachine').click(function () {
    fabmo.runSBP('C3');
});

$('#btn-ZeroZ').click(function () {
    fabmo.runSBP('C2');
});

$('#btn-Warmup').click(function () {
    fabmo.runSBP('C5');
});

$('#btn-SquareGnt').click(function () {
    fabmo.runSBP('C10');
});

$('#btn-MeasureBits').click(function () {
    fabmo.runSBP('&tool = 0 \n C72');
});

$('#btn-PlateOffset').click(function () {
    fabmo.runSBP('C73');
});

$('#btn-CalibrateToolbar').click(function () {
    fabmo.runSBP('C74');
});

$('.panel-block').click(function () {
    var clicked = $(this).attr('id');
    $('.' + clicked).show();
    $('.panel').hide();
});

$('.delete').click(function () {
    $('.section').hide();
    $('.panel').show();
});

$('#btn-setHome').click(function () {
    fabmo.runSBP('C99');
});