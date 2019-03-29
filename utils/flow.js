// date  自身路径 '/util/date.js'
// 无引用路径
;(function(_this){
var is_node = false;
var E = date_get;

function pad(num, size){ return ('000'+num).slice(-size); }

E.ms_to_dur = function(_ms){
    var s = '', sec = Math.floor(_ms/1000);
    if (sec<0)
    {
        s += '-';
        sec = -sec;
    }
    var days = Math.floor(sec/(60*60*24));
    sec -= days*60*60*24;
    var hours = Math.floor(sec/(60*60));
    sec -= hours*60*60;
    var mins = Math.floor(sec/60);
    sec -= mins*60;
    if (days)
        s += days + ' ' + (days>1 ? 'Days' : 'Day') + ' ';
    return s+pad(hours, 2)+':'+pad(mins, 2)+':'+pad(sec, 2);
};

E.dur_to_str = function(dur, opt){
    opt = opt||{};
    var parts = [];
    dur = +dur;
    function chop(period, name){
        if (dur<period)
            return;
        var number = Math.floor(dur/period);
        parts.push(number+name);
        dur -= number*period;
    }
    chop(ms.YEAR, 'y');
    chop(ms.MONTH, 'mo');
    if (opt.week)
        chop(ms.WEEK, 'w');
    chop(ms.DAY, 'd');
    chop(ms.HOUR, 'h');
    chop(ms.MIN, 'min');
    chop(ms.SEC, 's');
    if (dur)
        parts.push(dur+'ms');
    if (!parts.length)
        return '0s';
    return parts.slice(0, opt.units||parts.length).join(opt.sep||'');
};

E.monotonic = undefined;
E.init = function(){
    var adjust, last;
    if (typeof window=='object' && window.performance
        && window.performance.now)
    {
        // 10% slower than Date.now, but always monotonic
        adjust = Date.now()-window.performance.now();
        E.monotonic = function(){ return window.performance.now()+adjust; };
    }
    else if (is_node && !global.mocha_running)
    {
        // brings libuv monotonic time since process start
        var timer = process.binding('timer_wrap').Timer;
        adjust = Date.now()-timer.now();
        E.monotonic = function(){ return timer.now()+adjust; };
    }
    else
    {
        last = adjust = 0;
        E.monotonic = function(){
            var now = Date.now()+adjust;
            if (now>=last)
                return last = now;
            adjust += last-now;
            return last;
        };
    }
};
E.init();

E.str_to_dur = function(str, opt){
    opt = opt||{};
    var month = 'mo|mon|months?';
    if (opt.short_month)
        month +='|m';
    var m = str.replace(/ /g, '').match(new RegExp('^(([0-9]+)y(ears?)?)?'
        +'(([0-9]+)('+month+'))?(([0-9]+)w(eeks?)?)?(([0-9]+)d(ays?)?)?'
        +'(([0-9]+)h(ours?)?)?(([0-9]+)(min|minutes?))?'
        +'(([0-9]+)s(ec|econds?)?)?(([0-9]+)ms(ec)?)?$', 'i'));
    if (!m)
        return;
    return ms.YEAR*(+m[2]||0)+ms.MONTH*(+m[5]||0)+ms.WEEK*(+m[8]||0)
    +ms.DAY*(+m[11]||0)+ms.HOUR*(+m[14]||0)+ms.MIN*(+m[17]||0)
    +ms.SEC*(+m[20]||0)+(+m[23]||0);
};

E.months_long = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
E.months_short = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec'];
var months_short_lc = E.months_short.map(function(m){
    return m.toLowerCase(); });
E.days_long = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
    'Friday', 'Saturday'];
E.days_short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var days_short_lc = E.days_short.map(function(d){ return d.toLowerCase(); });
var days_long_lc = E.days_long.map(function(d){ return d.toLowerCase(); });
E.locale = {months_long: E.months_long, months_short: E.months_short,
    days_long: E.days_long, days_short: E.days_short, AM: 'AM', PM: 'PM'};
E.get = date_get;
function date_get(d, _new){
    var y, mon, day, H, M, S, _ms;
    if (d===undefined)
        return new Date();
    if (d==null)
        return new Date(null);
    if (d instanceof Date)
        return _new ? new Date(d) : d;
    if (typeof d=='string')
    {
        var m;
        d = d.trim();
        // check for ISO/SQL/JDate date
        if (m = /^((\d\d\d\d)-(\d\d)-(\d\d)|(\d\d?)-([A-Za-z]{3})-(\d\d(\d\d)?))\s*([\sT](\d\d):(\d\d)(:(\d\d)(\.(\d\d\d))?)?Z?)?$/
            .exec(d))
        {
            H = +m[10]||0; M = +m[11]||0; S = +m[13]||0; _ms = +m[15]||0;
            if (m[2]) // SQL or ISO date
            {
                y = +m[2]; mon = +m[3]; day = +m[4];
                if (!y && !mon && !day && !H && !M && !S && !_ms)
                    return new Date(NaN);
                return new Date(Date.UTC(y, mon-1, day, H, M, S, _ms));
            }
            if (m[5]) // jdate
            {
                y = +m[7];
                mon = months_short_lc.indexOf(m[6].toLowerCase())+1;
                day = +m[5];
                if (m[7].length==2)
                {
                    y = +y;
                    y += y>=70 ? 1900 : 2000;
                }
                return new Date(Date.UTC(y, mon-1, day, H, M, S, _ms));
            }
            // cannot reach here
        }
        // check for string timestamp
        if (/^\d+$/.test(d))
            return new Date(+d);
        // else might be parsed as non UTC!
        return new Date(d);
    }
    if (typeof d=='number')
        return new Date(d);
    throw new TypeError('invalid date '+d);
}

E.to_sql_ms = function(d){
    d = E.get(d);
    if (isNaN(d))
        return '0000-00-00 00:00:00.000';
    return pad(d.getUTCFullYear(), 4)+'-'+pad(d.getUTCMonth()+1, 2)
    +'-'+pad(d.getUTCDate(), 2)
    +' '+pad(d.getUTCHours(), 2)+':'+pad(d.getUTCMinutes(), 2)
    +':'+pad(d.getUTCSeconds(), 2)
    +'.'+pad(d.getUTCMilliseconds(), 3);
};
E.to_sql_sec = function(d){ return E.to_sql_ms(d).slice(0, -4); };
E.to_sql = function(d){
    return E.to_sql_ms(d).replace(/( 00:00:00)?....$/, ''); };
E.from_sql = E.get;

E.to_month_short = function(d){
    d = E.get(d);
    return E.months_short[d.getUTCMonth()];
};
E.to_month_long = function(d){
    d = E.get(d);
    return E.months_long[d.getUTCMonth()];
};
// timestamp format (used by tickets, etc). dates before 2000 not supported
E.to_jdate = function(d){
    d = E.get(d);
    return (pad(d.getUTCDate(), 2)+'-'+E.months_short[d.getUTCMonth()]
        +'-'+pad(d.getUTCFullYear()%100, 2)+' '+pad(d.getUTCHours(), 2)+
        ':'+pad(d.getUTCMinutes(), 2)+':'+pad(d.getUTCSeconds(), 2))
    .replace(/( 00:00)?:00$/, '');
};
// used in log file names
E.to_log_file = function(d){
    d = E.get(d);
    return d.getUTCFullYear()+pad(d.getUTCMonth()+1, 2)+pad(d.getUTCDate(), 2)
    +'_'+pad(d.getUTCHours(), 2)+pad(d.getUTCMinutes(), 2)
    +pad(d.getUTCSeconds(), 2);
};
E.from_log_file = function(d){
    var m = d.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
    if (!m)
        return;
    return new Date(Date.UTC(m[1], m[2]-1, m[3], m[4], m[5], m[6]));
};
// zerr compatible timestamp format
E.to_log_ms = function(d){ return E.to_sql_ms(d).replace(/-/g, '.'); };
E.from_rcs = function(d){
    var m = d.match(/^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!m)
        return;
    return new Date(Date.UTC(m[1], m[2]-1, m[3], m[4], m[5], m[6]));
};
E.to_rcs = function(d){ return E.to_sql_sec(d).replace(/[-: ]/g, '.'); };

E.sec = {
    MS: 0.001,
    SEC: 1,
    MIN: 60,
    HOUR: 60*60,
    DAY: 24*60*60,
    WEEK: 7*24*60*60,
    MONTH: 30*24*60*60,
    YEAR: 365*24*60*60,
};
E.ms = {};
for (var key in E.sec)
    E.ms[key] = E.sec[key]*1000;
var ms = E.ms;

E.align = function(d, align){
    d = E.get(d, 1);
    switch (align.toUpperCase())
    {
    case 'MS': break;
    case 'SEC': d.setUTCMilliseconds(0); break;
    case 'MIN': d.setUTCSeconds(0, 0); break;
    case 'HOUR': d.setUTCMinutes(0, 0, 0); break;
    case 'DAY': d.setUTCHours(0, 0, 0, 0); break;
    case 'WEEK':
        d.setUTCDate(d.getUTCDate()-d.getUTCDay());
        d.setUTCHours(0, 0, 0, 0);
        break;
    case 'MONTH': d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); break;
    case 'YEAR': d.setUTCMonth(0, 1); d.setUTCHours(0, 0, 0, 0); break;
    default: throw new Error('invalid align '+align);
    }
    return d;
};

E.add = function(d, dur){
    d = E.get(d, 1);
    if (dur.year)
        d.setUTCFullYear(d.getUTCFullYear()+dur.year);
    if (dur.month)
        d.setUTCMonth(d.getUTCMonth()+dur.month);
    ['day', 'hour', 'min', 'sec', 'ms'].forEach(function(key){
        if (dur[key])
            d.setTime(+d+dur[key]*ms[key.toUpperCase()]);
    });
    return d;
};

E.describe_interval = function(_ms){
    return _ms<2*ms.MIN ? Math.round(_ms/ms.SEC)+' sec' :
        _ms<2*ms.HOUR ? Math.round(_ms/ms.MIN)+' min' :
        _ms<2*ms.DAY ? Math.round(_ms/ms.HOUR)+' hours' :
        _ms<2*ms.WEEK ? Math.round(_ms/ms.DAY)+' days' :
        _ms<2*ms.MONTH ? Math.round(_ms/ms.WEEK)+' weeks' :
        _ms<2*ms.YEAR ? Math.round(_ms/ms.MONTH)+' months' :
        Math.round(_ms/ms.YEAR)+' years';
};

E.time_ago = function(d, until_date){
    var _ms = E.get(until_date)-E.get(d);
    if (_ms<ms.SEC)
        return 'right now';
    return E.describe_interval(_ms)+' ago';
};

E.ms_to_str = function(_ms){
    var s = ''+_ms;
    return s.length<=3 ? s+'ms' : s.slice(0, -3)+'.'+s.slice(-3)+'s';
};

E.parse = function(text, opt){
    opt = opt||{};
    if (opt.fmt)
        return E.strptime(text, opt.fmt);
    var d, a, i, v, _v, dir, _dir, amount, now = opt.now;
    now = !now ? new Date() : new Date(now);
    text = text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text)
        return;
    if (text=='now')
        return now;
    if (!isNaN(d = E.get(text)))
        return d;
    d = now;
    a = text.split(' ');
    dir = a.includes('ago') ? -1 : a.includes('last') ? -1 :
        a.includes('next') ? 1 : undefined;
    for (i=0; i<a.length; i++)
    {
        v = a[i];
        if (/^(ago|last|next)$/.test(v));
        else if (v=='today')
            d = E.align(d, 'DAY');
        else if (v=='yesterday')
            d = E.align(+d-ms.DAY, 'DAY');
        else if (v=='tomorrow')
            d = E.align(+d+ms.DAY, 'DAY');
        else if ((_v = days_short_lc.indexOf(v))>=0)
            d = new Date(+E.align(d, 'WEEK')+_v*ms.DAY+(dir||0)*ms.WEEK);
        else if ((_v = days_long_lc.indexOf(v))>=0)
            d = new Date(+E.align(d, 'WEEK')+_v*ms.DAY+(dir||0)*ms.WEEK);
        else if (_v = /^([+-]?\d+)(?:([ymoinwdhs]+)(\d.*)?)?$/.exec(v))
        {
            if (amount!==undefined)
                return;
            amount = dir!==undefined ? Math.abs(+_v[1]) : +_v[1];
            if (_v[2])
            {
                a.splice(i+1, 0, _v[2]);
                if (_v[3])
                    a.splice(i+2, 0, _v[3]);
            }
            continue;
        }
        else if (/^([ywdhs]|years?|months?|mon?|weeks?|days?|hours?|minutes?|min|seconds?|sec)$/.test(v))
        {
            _v = v[0]=='m' && v[1]=='i' ? ms.MIN :
                v[0]=='y' ? ms.YEAR : v[0]=='m' && v[1]=='o' ? ms.MONTH :
                v[0]=='w' ? ms.WEEK :
                v[0]=='d' ? ms.DAY : v[0]=='h' ? ms.HOUR : ms.SEC;
            amount = amount===undefined ? 1 : amount;
            _dir = dir===undefined ? opt.dir||1 : dir;
            if (_v==ms.MONTH)
                d.setUTCMonth(d.getUTCMonth()+_dir*amount);
            else if (_v==ms.YEAR)
                d.setUTCFullYear(d.getUTCFullYear()+_dir*amount);
            else
                d = new Date(+d+_v*amount*_dir);
            amount = undefined;
        }
        else
            return;
        if (amount!==undefined)
            return;
    }
    if (amount!==undefined)
        return;
    return d;
};

E.strptime = function(str, fmt){
    function month(m){ return months_short_lc.indexOf(m.toLowerCase()); }
    var parse = {
        '%': ['%', function(){}, 0],
        a: ['[a-z]+', function(m){}, 0],
        A: ['[a-z]+', function(m){}, 0],
        b: ['[a-z]+', function(m){ d.setUTCMonth(month(m)); }, 2],
        B: ['[a-z]+', function(m){ d.setUTCMonth(month(m)); }, 2],
        y: ['[0-9]{2}', function(m){
            d.setUTCFullYear(+m+(m<70 ? 2000 : 1900)); }, 1],
        Y: ['[0-9]{4}', function(m){ d.setUTCFullYear(+m); }, 1],
        m: ['[0-9]{0,2}', function(m){ d.setUTCMonth(+m-1); }, 2],
        d: ['[0-9]{0,2}', function(m){ d.setUTCDate(+m); }, 3],
        H: ['[0-9]{0,2}', function(m){ d.setUTCHours(+m); }, 4],
        M: ['[0-9]{0,2}', function(m){ d.setUTCMinutes(+m); }, 5],
        S: ['[0-9]{0,2}', function(m){ d.setUTCSeconds(+m); }, 6],
        s: ['[0-9]+', function(m){ d = new Date(+m); }, 0],
        L: ['[0-9]{0,3}', function(m){ d.setUTCMilliseconds(+m); }, 7],
        z: ['[+-][0-9]{4}', function(m){
            var timezone = +m.slice(0, 3)*3600+m.slice(3, 5)*60;
            d = new Date(+d-timezone*1000);
        }, 8],
        Z: ['[a-z]{0,3}[+-][0-9]{2}:?[0-9]{2}|[a-z]{1,3}', function(m){
            m = /^([a-z]{0,3})(?:([+-][0-9]{2}):?([0-9]{2}))?$/i.exec(m);
            if (m[1]=='Z' || m[1]=='UTC')
                return;
            var timezone = +m[2]*3600+m[3]*60;
            d = new Date(+d-timezone*1000);
        }, 8],
        I: ['[0-9]{0,2}', function(m){ d.setUTCHours(+m); }, 4],
        p: ['AM|PM', function(m){
            if (d.getUTCHours()==12)
                d.setUTCHours(d.getUTCHours()-12);
            if (m.toUpperCase()=='PM')
                d.setUTCHours(d.getUTCHours()+12);
        }, 9],
    };
    var ff = [];
    var ff_idx = [];
    var re = new RegExp('^\\s*'+fmt.replace(/%(?:([a-zA-Z%]))/g,
        function(_, fd)
    {
        var d = parse[fd];
        if (!d)
            throw Error('Unknown format descripter: '+fd);
        ff_idx[d[2]] = ff.length;
        ff.push(d[1]);
        return '('+d[0]+')';
    })+'\\s*$', 'i');
    var matched = str.match(re);
    if (!matched)
        return;
    var d = new Date(0);
    for (var i=0; i<ff_idx.length; i++)
    {
        var idx = ff_idx[i];
        var fun = ff[idx];
        if (fun)
            fun(matched[idx+1]);
    }
    return d;
};

var utc_local = {
    local: {
        getSeconds: function(d){ return d.getSeconds(); },
        getMinutes: function(d){ return d.getMinutes(); },
        getHours: function(d){ return d.getHours(); },
        getDay: function(d){ return d.getDay(); },
        getDate: function(d){ return d.getDate(); },
        getMonth: function(d){ return d.getMonth(); },
        getFullYear: function(d){ return d.getFullYear(); },
        getYearBegin: function(d){ return new Date(d.getFullYear(), 0, 1); }
    },
    utc: {
        getSeconds: function(d){ return d.getUTCSeconds(); },
        getMinutes: function(d){ return d.getUTCMinutes(); },
        getHours: function(d){ return d.getUTCHours(); },
        getDay: function(d){ return d.getUTCDay(); },
        getDate: function(d){ return d.getUTCDate(); },
        getMonth: function(d){ return d.getUTCMonth(); },
        getFullYear: function(d){ return d.getUTCFullYear(); },
        getYearBegin: function(d){ return new Date(Date.UTC(
            d.getUTCFullYear(), 0, 1)); }
    }
};

E.strftime = function(fmt, d, opt){
    function hours12(hours){
        return hours==0 ? 12 : hours>12 ? hours-12 : hours; }
    function ord_str(n){
        var i = n % 10, ii = n % 100;
        if (ii>=11 && ii<=13 || i==0 || i>=4)
            return 'th';
        switch (i)
        {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        }
    }
    function week_num(l, d, first_weekday){
        // This works by shifting the weekday back by one day if we
        // are treating Monday as the first day of the week.
        var wday = l.getDay(d);
        if (first_weekday=='monday')
            wday = wday==0 /* Sunday */ ? wday = 6 : wday-1;
        var yday = (d-l.getYearBegin(d))/ms.DAY;
        return Math.floor((yday + 7 - wday)/7);
    }
    // Default padding is '0' and default length is 2, both are optional.
    function padx(n, padding, length){
        // padx(n, <length>)
        if (typeof padding=='number')
        {
            length = padding;
            padding = '0';
        }
        // Defaults handle padx(n) and padx(n, <padding>)
        if (padding===undefined)
            padding = '0';
        length = length||2;
        var s = ''+n;
        // padding may be an empty string, don't loop forever if it is
        if (padding)
            for (; s.length<length; s = padding + s);
        return s;
    }
    opt = opt||{};
    d = E.get(d);
    var locale = opt.locale||E.locale;
    var formats = locale.formats||{};
    var tz = opt.timezone;
    var utc = opt.utc!==undefined ? opt.utc :
        opt.local!==undefined ? !opt.local :
        true;
    if (tz!=null)
    {
        utc = true;
        // ISO 8601 format timezone string, [-+]HHMM
        // Convert to the number of minutes and it'll be applied to the date
        // below.
        if (typeof tz=='string')
        {
            var sign = tz[0]=='-' ? -1 : 1;
            var hours = parseInt(tz.slice(1, 3), 10);
            var mins = parseInt(tz.slice(3, 5), 10);
            tz = sign*(60*hours+mins);
        }
        if (typeof tz=='number')
            d = new Date(+d+tz*60000);
    }
    var l = utc ? utc_local.utc : utc_local.local;
    // Most of the specifiers supported by C's strftime, and some from Ruby.
    // Some other syntax extensions from Ruby are supported: %-, %_, and %0
    // to pad with nothing, space, or zero (respectively).
    function replace(fmt){ return fmt.replace(/%([-_0]?.)/g, function(_, c){
        var mod, padding, day;
        if (c.length==2)
        {
            mod = c[0];
            if (mod=='-') // omit padding
                padding = '';
            else if (mod=='_') // pad with space
                padding = ' ';
            else if (mod=='0') // pad with zero
                padding = '0';
            else // unrecognized, return the format
                return _;
            c = c[1];
        }
        switch (c)
        {
        // Examples for new Date(0) in GMT
        case 'A': return locale.days_long[l.getDay(d)]; // 'Thursday'
        case 'a': return locale.days_short[l.getDay(d)]; // 'Thu'
        case 'B': return locale.months_long[l.getMonth(d)]; // 'January'
        case 'b': return locale.months_short[l.getMonth(d)]; // 'Jan'
        case 'C': // '19'
            return padx(Math.floor(l.getFullYear(d)/100), padding);
        case 'D': return replace(formats.D || '%m/%d/%y'); // '01/01/70'
        case 'd': return padx(l.getDate(d), padding); // '01'
        case 'e': return l.getDate(d); // '01'
        case 'F': return replace(formats.F || '%Y-%m-%d'); // '1970-01-01'
        case 'H': return padx(l.getHours(d), padding); // '00'
        case 'h': return locale.months_short[l.getMonth(d)]; // 'Jan'
        case 'I': return padx(hours12(l.getHours(d)), padding); // '12'
        case 'j': // '000'
            day = Math.ceil((+d-l.getYearBegin(d))/(1000*60*60*24));
            return pad(day, 3);
        case 'k': // ' 0'
            return padx(l.getHours(d), padding===undefined ? ' ' : padding);
        case 'L': return pad(Math.floor(d.getMilliseconds()), 3); // '000'
        case 'l': // '12'
            return padx(hours12(l.getHours(d)),
                padding===undefined ? ' ' : padding);
        case 'M': return padx(l.getMinutes(d), padding); // '00'
        case 'm': return padx(l.getMonth(d)+1, padding); // '01'
        case 'n': return '\n'; // '\n'
        case 'o': return ''+l.getDate(d)+ord_str(l.getDate(d)); // '1st'
        case 'P': // 'am'
            return (l.getHours(d)<12 ? locale.AM : locale.PM).toLowerCase();
        case 'p': return l.getHours(d)<12 ? locale.AM : locale.PM; // 'AM'
        case 'R': return replace(formats.R || '%H:%M'); // '00:00'
        case 'r': return replace(formats.r || '%I:%M:%S %p'); // '12:00:00 AM'
        case 'S': return padx(l.getSeconds(d), padding); // '00'
        case 's': return Math.floor(+d/1000); // '0'
        case 'T': return replace(formats.T || '%H:%M:%S'); // '00:00:00'
        case 't': return '\t'; // '\t'
        case 'U': return padx(week_num(l, d, 'sunday'), padding); // '00'
        case 'u': // '4'
            day = l.getDay(d);
            // 1 - 7, Monday is first day of the week
            return day==0 ? 7 : day;
        case 'v': return replace(formats.v || '%e-%b-%Y'); // '1-Jan-1970'
        case 'W': return padx(week_num(l, d, 'monday'), padding); // '00'
        case 'w': return l.getDay(d); // '4'. 0 Sunday - 6 Saturday
        case 'Y': return l.getFullYear(d); // '1970'
        case 'y': return (''+l.getFullYear(d)).slice(-2); // '70'
        case 'Z': // 'GMT'
            if (utc)
                return 'GMT';
            var tz_string = d.toString().match(/\((\w+)\)/);
            return tz_string && tz_string[1] || '';
        case 'z': // '+0000'
            if (utc)
                return '+0000';
            var off = typeof tz=='number' ? tz : -d.getTimezoneOffset();
            return (off<0 ? '-' : '+')+pad(Math.abs(off/60), 2)+pad(off%60, 2);
        default: return c;
        }
    }); }
    return replace(fmt);
};

// For a string like '11:00-23:30', returns a function that checks whether a
// given date (moment in time) belongs to the set.
// Syntax notes:
// * ':00' is optional: '11-23'
// * several intervals: '12-14 16-18'
// * '10-12' includes exact 10:00 but excludes exact 12:00
// * 24:00 is the same as 0:00, 25:00 is the same as 1:00, etc
// * intervals wrap around midnight: '23-7' is the same as '23-24 0-7'
// * therefore, '0-0' and '0-24' include all times
// * all times are assumed in UTC
E.compile_schedule = function(expr){
    var re = /^(\d\d?)(?::(\d\d?))?-(\d\d?)(?::(\d\d?))?$/;
    var parts = expr.split(/\s+/);
    var intervals = [];
    for (var i = 0; i<parts.length; i++)
    {
        if (!parts[i])
            continue;
        var m = re.exec(parts[i]);
        if (!m)
            throw new Error('Schedule syntax error: '+expr);
        var from = m[1]*ms.HOUR, to = m[3]*ms.HOUR;
        if (m[2])
            from += m[2]*ms.MIN;
        if (m[4])
            to += m[4]*ms.MIN;
        intervals.push({from: from%ms.DAY, to: to%ms.DAY});
    }
    return function(d){
        var t = E.get(d) % ms.DAY;
        for (var i = 0; i<intervals.length; i++)
        {
            var interval = intervals[i];
            if (interval.from<interval.to)
            {
                if (t>=interval.from && t<interval.to)
                    return true;
            }
            else
            {
                if (t<interval.to || t>=interval.from)
                    return true;
            }
        }
        return false;
    };
};

_this.date = E;
})(this);

// array  自身路径 '/util/array.js'
// 无引用路径
;(function(_this){
var E = {};

var proto_slice = Array.prototype.slice;
E.copy = function(a){
    switch (a.length)
    {
    case 0: return [];
    case 1: return [a[0]];
    case 2: return [a[0], a[1]];
    case 3: return [a[0], a[1], a[2]];
    case 4: return [a[0], a[1], a[2], a[3]];
    case 5: return [a[0], a[1], a[2], a[3], a[4]];
    default: return proto_slice.call(a);
    }
};

E.push = function(a){
    for (var i=1; i<arguments.length; i++)
    {
        var arg = arguments[i];
        if (Array.isArray(arg))
            a.push.apply(a, arg);
        else
            a.push(arg);
    }
    return a.length;
};
E.unshift = function(a){
    for (var i=arguments.length-1; i>0; i--)
    {
        var arg = arguments[i];
        if (Array.isArray(arg))
            a.unshift.apply(a, arg);
        else
            a.unshift(arg);
    }
    return a.length;
};

E.slice = function(args, from, to){
    return Array.prototype.slice.call(args, from, to); };

E.compact = function(a){ return E.compact_self(a.slice()); };
E.compact_self = function(a){
    var i, j, n = a.length;
    for (i=0; i<n && a[i]; i++);
    if (i==n)
        return a;
    for (j=i; i<n; i++)
    {
        if (!a[i])
            continue;
        a[j++] = a[i];
    }
    a.length = j;
    return a;
};

// same as _.flatten(a, true)
E.flatten_shallow = function(a){ return Array.prototype.concat.apply([], a); };
E.flatten = function(a){
    var _a = [], i;
    for (i=0; i<a.length; i++)
    {
        if (Array.isArray(a[i]))
            Array.prototype.push.apply(_a, E.flatten(a[i]));
        else
            _a.push(a[i]);
    }
    return _a;
};
E.unique = function(a){
    var _a = [];
    for (var i=0; i<a.length; i++)
    {
        if (!_a.includes(a[i]))
            _a.push(a[i]);
    }
    return _a;
};
E.to_nl = function(a, sep){
    if (!a || !a.length)
        return '';
    if (sep===undefined)
        sep = '\n';
    return a.join(sep)+sep;
};
E.sed = function(a, regex, replace){
    var _a = new Array(a.length), i;
    for (i=0; i<a.length; i++)
        _a[i] = a[i].replace(regex, replace);
    return _a;
};
E.grep = function(a, regex, replace){
    var _a = [], i;
    for (i=0; i<a.length; i++)
    {
        // don't use regex.test() since with //g sticky tag it does not reset
        if (a[i].search(regex)<0)
            continue;
        if (replace!==undefined)
            _a.push(a[i].replace(regex, replace));
        else
            _a.push(a[i]);
    }
    return _a;
};

E.rm_elm = function(a, elm){
    var i = a.indexOf(elm);
    if (i<0)
        return;
    a.splice(i, 1);
    return elm;
};

E.rm_elm_tail = function(a, elm){
    var i = a.length-1;
    if (elm===a[i]) // fast-path
    {
        a.pop();
        return elm;
    }
    if ((i = a.lastIndexOf(elm, i-1))<0)
        return;
    a.splice(i, 1);
    return elm;
};

E.add_elm = function(a, elm){
    if (a.includes(elm))
        return;
    a.push(elm);
    return elm;
};

E.split_every = function(a, n){
    var ret = [];
    for (var i=0; i<a.length; i+=n)
        ret.push(a.slice(i, i+n));
    return ret;
};

E.split_at = function(a, delim){
    var ret = [];
    delim = delim||'';
    for (var i=0; i<a.length; i++)
    {
        var chunk = [];
        for (; i<a.length && a[i]!=delim; i++)
            chunk.push(a[i]);
        if (chunk.length)
            ret.push(chunk);
    }
    return ret;
};

E.rotate = function(a, n){
    if (a && a.length>1 && (n = n%a.length))
        E.unshift(a, a.splice(n));
    return a;
};

E.move = function(a, from, to, n){
    return Array.prototype.splice.apply(a, [to, n]
        .concat(a.slice(from, from+n)));
};

E.to_array = function(v){ return Array.isArray(v) ? v : v==null ? [] : [v]; };

var proto = {};
proto.sed = function(regex, replace){
    return E.sed(this, regex, replace); };
proto.grep = function(regex, replace){
    return E.grep(this, regex, replace); };
proto.to_nl = function(sep){ return E.to_nl(this, sep); };
proto.push_a = function(){
    return E.push.apply(null, [this].concat(Array.from(arguments))); };
proto.unshift_a = function(){
    return E.unshift.apply(null, [this].concat(Array.from(arguments))); };
var installed;
E.prototype_install = function(){
    if (installed)
        return;
    installed = true;
    for (var i in proto)
    {
        Object.defineProperty(Array.prototype, i,
            {value: proto[i], configurable: true, enumerable: false,
            writable: true});
    }
};
E.prototype_uninstall = function(){
    if (!installed)
        return;
    installed = false;
    // XXX sergey: store orig proto, then load it back
    for (var i in proto)
        delete Array.prototype[i];
};
_this.array = E;
})(this);

// zutil 自身路径 '/util/util.js'
// 引用路径为 array = '/util/array.js'
;(function (_this) {
var node_util;
var is_node = false;
var array = _this.array
var E = {};

E._is_mocha = undefined;
E.is_mocha = function(){
    if (E._is_mocha!==undefined)
        return E._is_mocha;
    if (typeof process!='undefined' && typeof process.env!='undefined')
        return E._is_mocha = process.env.IS_MOCHA||false;
    return E._is_mocha = false;
};

E.is_lxc = function(){ return is_node && +process.env.LXC; };

E.f_mset = function(flags, mask, bits){ return (flags &~ mask) | bits; };
E.f_lset = function(flags, bits, logic){
    return E.f_mset(flags, bits, logic ? bits : 0); };
E.f_meq = function(flags, mask, bits){ return (flags & mask)==bits; };
E.f_eq = function(flags, bits){ return (flags & bits)==bits; };
E.f_cmp = function(f1, f2, mask){ return (f1 & mask)==(f2 & mask); };
E.xor = function(a, b){ return !a != !b; };
E.div_ceil = function(a, b){ return Math.floor((a+b-1)/b); };
E.ceil_mul = function(a, b){ return E.div_ceil(a, b)*b; };
E.floor_mul = function(a, b){ return Math.floor(a/b)*b; };

E.range = function(x, a, b){ return x>=a && x<=b; };
E.range.ii = function(x, a, b){ return x>=a && x<=b; };
E.range.ie = function(x, a, b){ return x>=a && x<b; };
E.range.ei = function(x, a, b){ return x>a && x<=b; };
E.range.ee = function(x, a, b){ return x>a && x<b; };

E.clamp = function(lower_bound, value, upper_bound){
    if (value < lower_bound)
        return lower_bound;
    if (value < upper_bound)
        return value;
    return upper_bound;
};

E.revcmp = function(a, b){
    return a>b ? -1 : a<b ? 1 : 0; };

/* Union given objects, using fn to resolve conflicting keys */
E.union_with = function(fn /*[o1, [o2, [...]]]*/){
    var res = {}, args;
    if (arguments.length==2 && typeof arguments[1]=='object')
        args = arguments[1];
    else
        args = array.slice(arguments, 1);
    for (var i = 0; i < args.length; ++i)
    {
        for (var key in args[i])
        {
            var arg = args[i];
            res[key] = res.hasOwnProperty(key) ? fn(res[key], arg[key])
                : arg[key];
        }
    }
    return res;
};

function _clone_deep(obj){
    var i, n, ret;
    if (obj instanceof Array)
    {
        ret = new Array(obj.length);
        n = obj.length;
        for (i = 0; i < n; i++)
            ret[i] = obj[i] instanceof Object ? _clone_deep(obj[i]): obj[i];
        return ret;
    }
    else if (obj instanceof Date)
        return new Date(obj);
    else if (obj instanceof RegExp)
        return new RegExp(obj);
    else if (obj instanceof Function)
        return obj;
    ret = {};
    for (i in obj)
        ret[i] = obj[i] instanceof Object ? _clone_deep(obj[i]) : obj[i];
    return ret;
}

E.clone_deep = function(obj){
    if (!(obj instanceof Object))
        return obj;
    return _clone_deep(obj);
};

// prefer to normally Object.assign() instead of extend()
E.extend = function(obj){ // like _.extend
    for (var i=1; i<arguments.length; i++)
    {
        var source = arguments[i];
        if (!source)
            continue;
        for (var prop in source)
            obj[prop] = source[prop];
    }
    return obj;
};

function is_object(obj){
    return obj && obj.constructor==Object; }

E.extend_deep = function(obj){
    if (!is_object(obj))
        return obj;
    for (var i=1; i<arguments.length; i++)
    {
        var source = arguments[i];
        if (!source)
            continue;
        for (var prop in source)
        {
            if (is_object(source[prop]) && is_object(obj[prop]))
                E.extend_deep(obj[prop], source[prop]);
            else
                obj[prop] = source[prop];
        }
    }
    return obj;
};
E.extend_deep_del_null = function(obj){
    for (var i=1; i<arguments.length; i++)
    {
        var source = arguments[i];
        if (!source)
            continue;
        for (var prop in source)
        {
            if (is_object(source[prop]))
            {
                if (!is_object(obj[prop]))
                    obj[prop] = {};
                E.extend_deep_del_null(obj[prop], source[prop]);
            }
            else if (source[prop]==null)
                delete obj[prop];
            else
                obj[prop] = source[prop];
        }
    }
    return obj;
};

E.defaults = function(obj){ // like _.defaults
    if (!obj)
        obj = {};
    for (var i=1; i<arguments.length; i++)
    {
        var source = arguments[i];
        if (obj===undefined)
            continue;
        for (var prop in source)
        {
            if (obj[prop]===undefined)
                obj[prop] = source[prop];
        }
    }
    return obj;
};
E.defaults_deep = function(obj){
    if (obj!==undefined && !is_object(obj))
        return obj;
    for (var i=1; i<arguments.length; i++)
    {
        var source = arguments[i];
        if (obj===undefined)
            obj = E.clone_deep(source);
        else if (is_object(source))
        {
            for (var prop in source)
            {
                var s = source[prop], d = obj[prop];
                if (d===undefined)
                    obj[prop] = E.clone_deep(s);
                else
                    E.defaults_deep(d, s);
            }
        }
    }
    return obj;
};

E.clone = function(obj){ // like _.clone
    if (!(obj instanceof Object))
        return obj;
    if (obj instanceof Array)
    {
        var a = new Array(obj.length);
        for (var i=0; i<obj.length; i++)
            a[i] = obj[i];
        return a;
    }
    return E.extend({}, obj);
};

E.freeze_deep = function(obj){
    if (typeof obj=='object')
    {
        for (var prop in obj)
        {
            if (obj.hasOwnProperty(prop))
                E.freeze_deep(obj[prop]);
        }
    }
    return Object.freeze(obj);
};

// Limitations:
// We know that not every data type can be reliably compared for equivalence
// (other than with ===). In equal_deep, we try to be conservative, returning
// false when we cannot be sure. Functions, however, are compared by their
// string serializations, which can lead to conflation of distinct closures.
// Cyclic references are not supported (cause a stack overflow).
E.equal_deep = function(a, b){
    var i;
    if (a===b)
        return true;
    if (!a || !b || a.constructor!==b.constructor)
        return false;
    if (a instanceof Function || a instanceof RegExp)
        return a.toString()==b.toString();
    if (a instanceof Date)
        return +a == +b;
    if (Array.isArray(a))
    {
        if (a.length!=b.length)
            return false;
        for (i = 0; i<a.length; i++)
        {
            if (!E.equal_deep(a[i], b[i]))
                return false;
        }
        return true;
    }
    if (is_object(a))
    {
        var a_keys = Object.keys(a), b_keys = Object.keys(b);
        if (a_keys.length!=b_keys.length)
            return false;
        for (i = 0; i<a_keys.length; i++)
        {
            var key = a_keys[i];
            if (!E.equal_deep(a[key], b[key]))
                return false;
        }
        return true;
    }
    return false;
};

// like _.map() except returns object, not array
E.map_obj = function(obj, fn){
    var ret = {};
    for (var i in obj)
        ret[i] = fn(obj[i], i, obj);
    return ret;
};

// recursivelly recreate objects with keys added in order
E.sort_obj = function(obj, fn){
    if (obj instanceof Array || !(obj instanceof Object))
        return obj;
    var ret = {}, keys = Object.keys(obj).sort(fn);
    for (var i=0; i<keys.length; i++)
        ret[keys[i]] = E.sort_obj(obj[keys[i]], fn);
    return ret;
};

// an Object equivalent of Array.prototype.forEach
E.forEach = function(obj, fn, _this){
    for (var i in obj)
        fn.call(_this, obj[i], i, obj);
};
// an Object equivalent of Array.prototype.find
E.find = function(obj, fn, _this){
    for (var i in obj)
    {
        if (fn.call(_this, obj[i], i, obj))
            return obj[i];
    }
};
E.find_prop = function(obj, prop, val){
    return E.find(obj, function(o){ return o[prop]===val; }); };
E.isspace = function(c){ return /\s/.test(c); };
E.isdigit = function(c){ return c>='0' && c<='9'; };
E.isalpha = function(c){ return (c>='a' && c<='z') || (c>='A' && c<='Z'); };
E.isalnum = function(c){ return E.isdigit(c)||E.isalpha(c); };

E.obj_pluck = function(obj, prop){
    var val = obj[prop];
    delete obj[prop];
    return val;
};

// Object.keys() does not work on prototype
E.proto_keys = function(proto){
    var keys = [];
    for (var i in proto)
        keys.push(i);
    return keys;
};

E.values = function(obj){
    var values = [];
    for (var i in obj)
        values.push(obj[i]);
    return values;
};

E.path = function(path){
    if (Array.isArray(path))
        return path;
    path = ''+path;
    if (!path)
        return [];
    return path.split('.');
};
E.get = function(o, path, def){
    path = E.path(path);
    for (var i=0; i<path.length; i++)
    {
        // XXX vladimir/ron: decide on implementation without in operator
        if (!o || (typeof o!='object' && typeof o!='function') ||
            !(path[i] in o))
        {
            return def;
        }
        o = o[path[i]];
    }
    return o;
};
E.set = function(o, path, value){
    path = E.path(path);
    for (var i=0; i<path.length-1; i++)
    {
        var p = path[i];
        o = o[p] || (o[p] = {});
    }
    o[path[path.length-1]] = value;
};
E.unset = function(o, path){
    path = E.path(path);
    for (var i=0; i<path.length-1; i++)
    {
        var p = path[i];
        if (!o[p])
            return;
        o = o[p];
    }
    delete o[path[path.length-1]];
};
var has_unique = {};
E.has = function(o, path){ return E.get(o, path, has_unique)!==has_unique; };
E.own = function(o, prop){
    return Object.prototype.hasOwnProperty.call(o, prop); };

E.bool_lookup = function(a, split){
    var ret = {}, i;
    if (typeof a=='string')
        a = a.split(split||/\s/);
    for (i=0; i<a.length; i++)
        ret[a[i]] = true;
    return ret;
};

E.clone_inplace = function(dst, src){
    if (dst===src)
        return dst;
    if (Array.isArray(dst))
    {
        for (var i=0; i<src.length; i++)
            dst[i] = src[i];
        dst.splice(src.length);
    }
    else if (typeof dst=='object')
    {
        for (var k in src)
            dst[k] = src[k];
        for (k in dst)
        {
            if (!src.hasOwnProperty(k))
                delete dst[k];
        }
    }
    return dst;
};

if (node_util && node_util.inherits)
    E.inherits = node_util.inherits;
else
{
    // implementation from node.js 'util' module
    E.inherits = function inherits(ctor, superCtor){
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype,
            {constructor: {value: ctor, enumerable: false, writable: true,
            configurable: true}});
    };
}

// ctor must only have one prototype level
// XXX vladislav: ES6 class is not supported for ctor
E.inherit_init = function(obj, ctor, params){
    var orig_proto = Object.getPrototypeOf(obj);
    var ctor_proto = Object.assign({}, ctor.prototype);
    Object.setPrototypeOf(ctor_proto, orig_proto);
    Object.setPrototypeOf(obj, ctor_proto);
    return ctor.apply(obj, params);
};

E.pick = function(obj){
    var i, o = {};
    for (i=1; i<arguments.length; i++)
    {
        if (E.own(obj, arguments[i]))
            o[arguments[i]] = obj[arguments[i]];
    }
    return o;
};

// subset of _.omit
E.omit = function(obj, omit){
    var i, o = {};
    obj = Object(obj);
    for (i in obj)
    {
        if (!omit.includes(i))
            o[i] = obj[i];
    }
    return o;
};

_this.zutil = E;
})(this);

// conv 自身路径为 '/util/conv.js'
// 无引用路径
;(function(_this){
var hash, assert, zerr, vm;
assert = function(){};
zerr = function(){ console.log.apply(console, arguments); };
zerr.perr = zerr;

var E = {};

var has_map = typeof Map=='function' && Map.prototype.get && Map.prototype.set;
has_map = 0; // XXX: unit-test and remove
E.cache_str_map_fn = function(fn){
    var cache = new Map();
    return function(s){
        s = ''+s;
        var v = cache.get(s);
        if (v!==undefined || cache.has(s))
            return v;
        cache.set(s, v = fn(s));
        return v;
    };
};
E.cache_str_obj_fn = function(fn){
    var cache = {};
    return function(s){
        if (s in cache)
            return cache[s];
        return cache[s] = fn(s);
    };
};
E.cache_str_fn = has_map ? E.cache_str_map_fn : E.cache_str_obj_fn;

E.cache_str_fn2 = function(fn){
    var cache = {};
    return function(s1, s2){
        var cache2 = cache[s1] = cache[s1]||{};
        if (s2 in cache2)
            return cache2[s2];
        return cache2[s2] = fn(s1, s2);
    };
};

E.o = function(oct_str){ return parseInt(oct_str, 8); };

// XXX vladimir: only nodejs
E.md5 = function(buf, hash_len, encoding){
    // update() ignores encoding if buf is a Buffer
    return hash.createHash('md5').update(buf, encoding||'utf8')
    .digest('hex').slice(0, hash_len);
};
E.md5_zero = function(key, hash_len){
    assert(hash_len<=32, 'invalid hash len'+hash_len);
    if (!key || !key.length)
        return '0'.repeat(hash_len);
    return E.md5(key, hash_len);
};
E.md5_etag = function(buf){ return E.md5(buf, 8); };

E.inet_ntoa_t = function(ip){
    return ((ip & 0xff000000)>>>24)+'.'+((ip & 0xff0000)>>>16)+'.'
    +((ip & 0xff00)>>>8)+'.'+(ip & 0xff);
};

E.inet_addr = function(ip){
    var parts = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
    if (parts===null)
        return null;
    if (parts[1]>255 || parts[2]>255 || parts[3]>255 || parts[4]>255)
        return null; // not an IP address
    return (parts[1]<<24)+(parts[2]<<16)+(parts[3]<<8)+(parts[4]|0)>>>0;
};

function flags_to_str_once(flags, conv){
    var f = 'var s = "";\n';
    f += 'if (!flags) return "";\n';
    for (var i in conv)
    {
        if (!conv.hasOwnProperty(i))
            continue;
        f += 'if (flags & '+conv[i]+') '
            +'{ s += '+JSON.stringify(i.toLowerCase())+'+" ";'
            +' flags &= ~'+conv[i]+'; }\n';
    }
    f += 'if (flags && conv.__conv_to_str.err) '
        +'conv.__conv_to_str.err(flags, conv);\n';
    f += 'return s.slice(0, -1);\n';
    var func = new Function(['flags', 'conv'], f);
    Object.defineProperty(conv, '__conv_to_str',
        {enumerable: false, writable: true});
    conv.__conv_to_str = func;
    func.err = function(_flags, _conv){
        zerr.perr('flags_str_invalid', 'flags '+_flags+' '
            +JSON.stringify(_conv).slice(0, 30));
    };
    return conv.__conv_to_str(flags, conv);
}

E.flags_to_str = function(flags, conv){
    if (conv.__conv_to_str)
        return conv.__conv_to_str(flags, conv);
    return flags_to_str_once(flags, conv);
};

function flags_from_str_once(s, conv){
    var f = 'var flags = 0, a, i;\n';
    f += 'if (!s) return 0;\n';
    f += 's = s.toUpperCase();\n';
    f += 'a = s.split(",");\n';
    f += 'for (i=0; i<a.length; i++)\n';
    f += '{\n';
    f += '    if (!conv[a[i]])\n';
    f += '    {\n';
    f += '        if (flags && conv.__conv_from_str.err) '
        +'conv.__conv_from_str.err(flags, conv);\n';
    f += '        return -1;\n';
    f += '    }\n';
    f += '    flags |= conv[a[i]];\n';
    f += '}\n';
    f += 'return flags;\n';
    var func = new Function(['s', 'conv'], f);
    Object.defineProperty(conv, '__conv_from_str',
        {enumerable: false, writable: true});
    conv.__conv_from_str = func;
    func.err = function(_s, _conv){
        zerr.perr('flags_str_invalid', 'flags '+_s+' '
            +JSON.stringify(_conv).slice(0, 30));
    };
    return conv.__conv_from_str(s, conv);
}

E.flags_from_str = function(s, conv){
    if (conv.__conv_from_str)
        return conv.__conv_from_str(s, conv);
    return flags_from_str_once(s, conv);
};

E.scale_vals = {
    1000: [{s: '', n: 1}, {s: 'K', n: 1e3}, {s: 'M', n: 1e6},
        {s: 'G', n: 1e9}, {s: 'T', n: 1e12}, {s: 'P', n: 1e15}],
    1024: [{s: '', n: 1}, {s: 'K', n: 1024}, {s: 'M', n: Math.pow(1024, 2)},
        {s: 'G', n: Math.pow(1024, 3)}, {s: 'T', n: Math.pow(1024, 4)},
        {s: 'P', n: Math.pow(1024, 5)}],
};

E.scaled_number = function(num, opt){
    opt = opt||{};
    var sign = '', per = opt.per, scale = opt.scale;
    var base = opt.base==1024 ? 1024 : 1000, ratio = opt.ratio||1;
    var units = opt.units===undefined||opt.units;
    function _per(){ return per ? E.fmt_per(per) : ''; }
    if (num<0)
    {
        sign = '-';
        num = -num;
    }
    if (num===undefined)
        return '';
    if (isNaN(num))
        return opt.nan||'x';
    if (num==Infinity)
        return sign+'\u221e';
    var scale_vals = E.scale_vals[base], i = 0;
    if (scale==null)
        for (; i<scale_vals.length-1 && num>=scale_vals[i+1].n*ratio; i++);
    else
        i = scale_vals.findIndex(function(_scale){ return _scale.s==scale; });
    if (per=='ms' && i)
    {
        per = 's';
        i--;
        num = num/1000;
    }
    scale = scale_vals[i];
    if (opt.is_scale)
        return scale.n;
    num /= scale.n;
    if (num<0.001)
        return '0'+_per();
    if (num>=base-1)
        num = Math.trunc(num);
    var str = num.toFixed(num<1 ? 3 : num<10 ? 2 : num<100 ? 1 : 0);
    return sign+str.replace(/((\.\d*[1-9])|\.)0*$/, '$2')
        +(units ? (opt.space ? ' ' : '')+scale.s : '')+_per();
};

E.scaled_bytes = function(num, opt){
    return E.scaled_number(num, Object.assign({base: 1000}, opt)); };

E.fmt_currency = function(amount, digits, currency_sign){
    if (amount===undefined)
        return;
    if (digits===undefined)
        digits = 2;
    if (currency_sign===undefined)
        currency_sign = '$';
    var sign = amount<0 ? '-' : '';
    amount = Math.abs(amount);
    amount = (+amount).toLocaleString('en-GB', {useGrouping: true,
        maximumFractionDigits: digits})||amount;
    return sign+currency_sign+amount;
};

E.fmt_per = function(per){
    if (!per)
        return '';
    switch (per)
    {
    case 's': case 'ms': return per;
    case '%': case '%%': return '%';
    default: return '/'+per[0];
    }
};

// Takes a function or its string serialization (f.toString()), returns object:
//     name: declared name or null
//     args: array of declared argument names
//     body: function body excluding the outermost braces
// XXX: when necessary, add support for comments inside argument list,
// arrow functions, generator functions, rest parameters, default parameters,
// destructuring parameters
E.parse_function = function(f){
    var m = /^function\s*([\w$]+)?\s*\(\n?([\s\w$,]*?)(\s*\/\*`*\*\/)?\)\s*\{\n?([\s\S]*?)\n?\}$/
        .exec(f);
    return {
        name: m[1]||null,
        args: m[2] ? m[2].split(/\s*,\s*/) : [],
        body: m[4],
    };
};

function date_stringify(d){ return {__ISODate__: d.toISOString()}; }

var pos_inf = {__Infinity__: 1};
var neg_inf = {__Infinity__: -1};
function replace_inf(k, v){
    switch (v)
    {
    case Infinity: return pos_inf;
    case -Infinity: return neg_inf;
    default: return v;
    }
}

E.JSON_stringify = function(obj, opt){
    var s, prev_date, _date, prev_func, prev_re;
    var date_class, func_class, re_class;
    opt = opt||{};
    if (opt.date)
        _date = typeof opt.date=='function' ? opt.date : date_stringify;
    if (opt.mongo)
        _date = date_stringify;
    if (_date)
    {
        date_class = opt.vm_context ?
            vm.runInContext('Date', opt.vm_context) : Date;
        prev_date = date_class.prototype.toJSON;
        date_class.prototype.toJSON = function(){ return _date(this); };
    }
    if (opt.func)
    {
        func_class = opt.vm_context ?
            vm.runInContext('Function', opt.vm_context) : Function;
        prev_func = func_class.prototype.toJSON;
        func_class.prototype.toJSON = function(){
            return {__Function__: this.toString()}; };
    }
    if (opt.re)
    {
        re_class = opt.vm_context ?
            vm.runInContext('RegExp', opt.vm_context) : RegExp;
        prev_re = re_class.prototype.toJSON;
        Object.defineProperty(re_class.prototype, 'toJSON', {
            value: function(){ return {__RegExp__: this.toString()}; },
            writable: true,
        });
    }
    var opt_replacer = opt.replacer;
    var replacer = opt_replacer;
    if (opt.inf)
    {
        if (opt_replacer && typeof opt_replacer=='function')
        {
            replacer = function(k, v){
                if (this==pos_inf || this==neg_inf)
                    return v;
                // http://es5.github.io/#x15.12.3 replacer.call(this, k, v)
                return opt_replacer.call(this, k,
                    replace_inf.call(this, k, v));
            };
        }
        else if (opt_replacer && Array.isArray(opt_replacer))
        {
            replacer = function(k, v){
                // when replacer is an array - original object SHOULD be kept
                if (v==obj || this==pos_inf || this==neg_inf)
                    return v;
                if (opt_replacer.includes(k))
                    return replace_inf.call(this, k, v);
            };
        }
        else
            replacer = replace_inf;
    }
    try { s = JSON.stringify(obj, replacer, opt.spaces); }
    finally {
        if (_date)
            date_class.prototype.toJSON = prev_date;
        if (opt.func)
            func_class.prototype.toJSON = prev_func;
        if (opt.re)
            re_class.prototype.toJSON = prev_re;
    }
    if (opt.mongo)
        s = s.replace(/\{"__ISODate__":("[0-9TZ:.-]+")\}/g, 'ISODate($1)');
    return s;
};

function parse_leaf(v, opt){
    if (!v || typeof v!='object' || Object.keys(v).length!=1)
        return v;
    if (v.__ISODate__ && opt.date)
        return new Date(v.__ISODate__);
    if (v.__Function__ && opt.func)
    {
        if (vm)
            return vm.runInThisContext('"use strict";('+v.__Function__+')');
        // fallback for browser environment
        return new Function('', '"use strict";return ('+v.__Function__+');')();
    }
    if (v.__RegExp__ && opt.re)
    {
        var parsed = /^\/(.*)\/(\w*)$/.exec(v.__RegExp__);
        if (!parsed)
            throw new Error('failed parsing regexp');
        return new RegExp(parsed[1], parsed[2]);
    }
    if (v.__Infinity__ && opt.inf)
        return v.__Infinity__ < 0 ? -Infinity : Infinity;
    return v;
}

function parse_obj(v, opt){
    if (!v || typeof v!='object')
        return v;
    if (Array.isArray(v))
    {
        for (var i = 0; i<v.length; i++)
            v[i] = parse_obj(v[i], opt);
        return v;
    }
    var v2 = parse_leaf(v, opt);
    if (v2!==v)
        return v2;
    for (var key in v)
        v[key] = parse_obj(v[key], opt);
    return v;
}

E.JSON_parse = function(s, opt){
    opt = Object.assign({date: true, re: true, func: true, inf: true}, opt);
    return JSON.parse(s, function(k, v){ return parse_leaf(v, opt); });
};

E.JSON_parse_obj = function(v, opt){
    opt = Object.assign({date: true, re: true, func: true, inf: true}, opt);
    return parse_obj(v, opt);
};

E.hex2bin = function(hex, opt){
    var byte_array = opt && opt.byte_array;
    var bin = byte_array ? new Uint8Array() : [];
    var re = /('.)|([0-9a-f][0-9a-f]?)|\s+|[.-]|(.)/gi;
    var m, v;
    for (re.lastIndex = 0; m = re.exec(hex);)
    {
        if (m[1])
            v = m[1].charCodeAt(1);
        else if (m[2])
            v = parseInt(m[2], 16);
        else if (m[3])
            return null; // throw new Error('invalid hex code');
        else
            continue;
        bin.push(v);
    }
    return bin;
};

E.bin2hex = function(arr){
    var s = '', v, i;
    for (i=0; i<arr.length; i++)
    {
        v = (arr[i]&0xff).toString(16).toUpperCase();
        s += (v.length<2 ? '0' : '')+v+' ';
    }
    return s.trim();
};

E.str2bin = function(s, offset){
    var len;
    if (!s || !(len = s.length))
        return;
    offset = offset||0;
    var arr = new Uint8Array(len-offset);
    for (var i=offset, j=0; i<len; i++, j++)
        arr[j] = s.charCodeAt(i);
    return arr;
};

E.tab2sp = function(line){
     var added = 0;
     return line.replace(/\t/g, function(m, offset, str){
         var insert = 8-(added+offset)%8;
         added += insert-1;
         return ' '.repeat(insert);
     });
};

E.str2utf8bin = function(s){
    if (!s||!s.length)
        return;
    var arr = new Uint8Array(s.length*3);
    var len = s.length, i = 0, j = 0, c, extra;
    while (i<len)
    {
        c = s.charCodeAt(i++);
        if (c >= 0xD800 && c <= 0xDBFF && i < len)
        {
            extra = s.charCodeAt(i++);
            if ((extra & 0xFC00) == 0xDC00)
                c = ((c & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
            else
                i--;
        }
        if ((c & 0xFFFFFF80) == 0)
            arr[j++] = c;
        else
        {
            if ((c & 0xFFFFF800) == 0)
                arr[j++] = c >> 6 & 0x1F | 0xC0;
            else if ((c & 0xFFFF0000) == 0)
            {
                arr[j++] = c >> 12 & 0x0F | 0xE0;
                arr[j++] = c >> 6 & 0x3F | 0x80;
            }
            else if ((c & 0xFFE00000) == 0)
            {
                arr[j++] = c >> 18 & 0x07 | 0xF0;
                arr[j++] = c >> 12 & 0x3F | 0x80;
                arr[j++] = c >> 6 & 0x3F | 0x80;
            }
            arr[j++] = c & 0x3F | 0x80;
        }
    }
    return arr.slice(0, j);
};

E.utf8bin2str = function(arr, offset, len){
    if (arr.byteLength&&!arr.length)
        arr = new Uint8Array(arr);
    var out = '', i = offset||0, cp;
    var c, char2, char3, char4;
    len = len ? i+len : arr.length;
    while (i<len)
    {
        c = arr[i++];
        switch (c >> 4)
        {
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
        case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = arr[i++];
            out += String.fromCharCode((c & 0x1F) << 6 | char2 & 0x3F);
            break;
        case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = arr[i++];
            char3 = arr[i++];
            out += String.fromCharCode((c & 0x0F) << 12 |
                (char2 & 0x3F) << 6 |
                (char3 & 0x3F) << 0);
            break;
        case 15:
            char2 = arr[i++];
            char3 = arr[i++];
            char4 = arr[i++];
            cp = (c & 0x03) << 18 | (char2 & 0x3F) << 12 |
                (char3 & 0x3F) << 6 | char4 & 0x3F;
            cp -= 0x10000;
            out += String.fromCharCode(0xD800|cp>>10);
            out += String.fromCharCode(0xDC00|cp&0x3ff);
            break;
        }
    }
    return out;
};

_this.conv = E
})(this);

// util 自身路径 '/svc/calc_cost/util.js'
// 引用路径为 date = '/util/date.js'  conv = '/util/conv.js'
;(function(_this){
var [date, conv] = [_this.date, _this.conv]
var E = {};
var fmt_d = date.strftime.bind(date, '%e %b %Y');

E.GB = 1000000000;
E.GB_UNIT = 'GB';
E.NA = 'N/A';

E.fmt_period = function(from, to, full){
    from = date(from);
    to = date(to);
    if (full)
        return fmt_d(from)+' until '+fmt_d(to);
    if (!(from-to))
        return fmt_d(from);
    if (from.getUTCMonth()==to.getUTCMonth())
        return from.getUTCDate()+' - '+fmt_d(to);
    if (from.getUTCFullYear()==to.getUTCFullYear())
        return date.strftime('%e %b', from)+' - '+fmt_d(to);
    return fmt_d(from)+' - '+fmt_d(to);
};

E.get_arr = function(val, delim){
    if (val==null || val==='')
        return [];
    if (Array.isArray(val))
        return val;
    if (typeof val!='string')
        return [val];
    return val.split(delim||/\s+/).filter(function(v){ return !!v; });
};

E.get_count = function(str_or_arr, delim){
    return E.get_arr(str_or_arr, delim).length; };

E.get_plan_index_by_date = function(plans, d){
    d = date(d);
    plans = plans||[];
    var plan;
    for (var i=plans.length-1; i>=0; i--)
    {
        plan = plans[i];
        if (!plan.start)
            throw new Error('No start date for plan: '+i);
        if (+date(plan.start)==+d)
            return i;
    }
    return -1;
};

E.get_zone_last_plan = function(zone){
    return zone && zone.plans && zone.plans[zone.plans.length-1]; };

// XXX viktor: review edit===0 comparisons
E.is_zone_editable = function(zone){
    var last_plan = E.get_zone_last_plan(zone);
    return !(last_plan && last_plan.edit===0);
};

// XXX viktor: review calls, replace with get_zone_last_plan when possible
E.get_last_plan = function(plans, d){
    return E.get_plan(plans, d, {last: true}); };

E.get_any_plan = function(plans, d){
    return E.get_plan(plans, d, {ignore_all: true})||{}; };

E.get_plan = function(plans, d, opt){
    d = date(d);
    plans = plans||[];
    opt = opt||{};
    var plan;
    for (var i=plans.length-1; i>=0; i--)
    {
        plan = plans[i];
        if (!plan.start)
            throw new Error('No start date for plan: '+i);
        if (date(plan.start)<=d)
        {
            if (plan.end && d>=date(plan.end) && !opt.ignore_all)
                return;
            if (plan.valid_till && d>=date(plan.valid_till) && !opt.ignore_all)
                return;
            if (plan.disable)
            {
                if (!opt.last && (!opt.ignore_all || plan.disable!='noperm'))
                    return;
            }
            return plan;
        }
    }
    if (opt.ignore_all && plan && (!plan.disable || plan.disable=='noperm'))
        return plan;
};

E.match = function(rules, entry, strict){
    return rules&&rules.find(function(rule){
        return Object.keys(rule.match||{}).every(function(k){
            var ev = entry[k], rv = rule.match[k];
            return ev==rv || !rv&&!ev || !strict&&(rv=='*' || rv=='+'&&ev);
        });
    });
};

E.sum = function(a, b){
    return a===undefined && b===undefined ? undefined : (a||0)+(b||0);
};

var digits_num = function(n){
    return (''+n).includes('.') ? (''+n).replace(/^\d+\./, '').length : 0; };

E.fmt_num = function(num, digits){
    if (isNaN(num))
        return;
    if (digits==undefined && num<0.1)
        digits = Math.min(Math.max(digits_num(num), 2), 6);
    return +num.toFixed(digits!==undefined ? digits : 2);
};

E.cost2str = function(cost, opt){
    opt = opt||{};
    if (cost===undefined)
        return E.NA;
    if (typeof cost=='string')
        return cost;
    if (typeof cost=='number')
        return conv.fmt_currency(cost, 6)+'/'+(opt.unit||E.GB_UNIT);
    cost = cost&&cost.def||cost;
    var type = Object.keys(cost)[0], s = '';
    if (!opt.html)
    {
        switch (type)
        {
        case 'steps': s += 'Tiered'; break;
        case 'slide': s += 'Volume'; break;
        default: throw new Error('Unsupported cost ['+type+'] in '
            +JSON.stringify(cost));
        }
    }
    s += E.fmt_steps(cost[type], type, opt.html ? 'html' : 'string',
        opt.unit, opt.per);
    return opt.html ? '<table>'+s+'</table>' : s;
};

// XXX viktor: add tests
E.fmt_steps = function(steps, type, format, unit, per){
    unit = unit||E.GB_UNIT;
    per = unit==E.GB_UNIT ? E.GB : 1;
    var prev = 0, s = format=='raw' ? [] : '';
    for (var i=0; i<steps.length; i++)
    {
        var step = typeof steps[i]=='number' ? {price: steps[i]}
            : Array.isArray(steps[i]) ? {gb: steps[i][0], price: steps[i][1]}
            : {gb: steps[i].gb, price: steps[i].price};
        step.gb = step.gb!=null ? step.gb : Infinity;
        var is_last = i==steps.length-1, l = '';
        var scaled_prev = conv.scaled_number(prev*per);
        var scaled_cur = conv.scaled_number(step.gb*per);
        var _scaled_prev = scaled_prev;
        if (_scaled_prev.slice(-1)==scaled_cur.slice(-1))
            _scaled_prev = _scaled_prev.slice(0, _scaled_prev.length-1);
        if (type=='steps')
            l += is_last ? '>' : _scaled_prev+'–';
        if (type=='slide')
            l += is_last ? '>' : '0–';
        l += (is_last ? scaled_prev : scaled_cur)
            +(unit==E.GB_UNIT ? 'B' : unit);
        var p = conv.fmt_currency(step.price, 4)+'/'+unit;
        switch (format)
        {
            case 'string': s += (i ? ', ' : ' ')+l+' '+p; break;
            case 'html': s += '<tr><td>'+l+'</td><td>'+p+'</td></tr>'; break;
            case 'raw': s.push({gb: l, price: p}); break;
        }
        prev = step.gb;
    }
    return s;
};

E.ucfirst = function(str){ return str && str[0].toUpperCase()+str.slice(1); };

_this.util = E;
})(this);

// calc_cost_featured   自身路径 '/svc/calc_cost/featured.js'
// 引用路径为 date = '/util/date.js' zutil = '/util/util.js' util = '/svc/calc_cost/util.js'
;(function(_this){
var _typeof = function (obj) {return typeof obj;}
var [date, zutil, util] = [_this.date, _this.zutil, _this.util];

var assign = Object.assign,is_num = Number.isFinite,ms = date.ms;

var E = function E(opt) {return E.calc(opt);};
E.t = {};

E.calc_bill = function (ccdata, custs, usage, period, opt) {
    ccdata = E.t.get_ccdata(ccdata);
    custs = E.t.get_customers(custs);
    usage = E.t.get_usage(usage, custs);
    period = E.t.get_bill_period(period);
    opt = E.t.defaults(opt, { usage: 1, precommit: 1, vat: 1,
        metric: 'bw_sum' });
    if (opt.plan_filter)
    opt.nof = { precommit: opt.precommit, metric: opt.metric };
    var res = {};
    for (var cname in custs)
    {
        if (cname == '_mono')
        continue;
        var cres = { cname: cname, period: period, explain: opt.explain && {} };
        if (opt.nof)
        cres.nof = { cname: cname, period: period };
        var pr = E.t.search_hist(custs[cname].pricing, +period.to - ms.DAY,
        { any: 1 });
        if (pr && pr.daily_precommit)
        opt = assign({}, opt, { daily_precommit: true });
        E.t.visit(ccdata, custs[cname], period, usage[cname], {
            zusage: opt.usage && E.t.multi_cb(
            E.t.usage_cost_cb(cres, usage[cname], opt),
            cres.nof && E.t.usage_cost_cb(cres.nof, usage[cname], opt.nof)),

            precommit: opt.precommit && E.t.multi_cb(
            E.t.precommit_cost_cb(cres, opt),
            cres.nof && E.t.precommit_cost_cb(cres.nof, opt.nof)),

            global: opt.vat && E.t.vat_cb(cres) });

        res[cname] = E.t.get_cost_result(cres, opt);
    }
    return custs._mono ? res[custs._mono] : res;
};

// same opts as calc_bill
E.calc_period_cost = function (ccdata, custs, usage, period, opt) {
    ccdata = E.t.get_ccdata(ccdata);
    custs = E.t.get_customers(custs);
    usage = E.t.get_usage(usage, custs);
    opt = assign({}, opt);
    var res = {};var _loop = function _loop(
    cname) {

        if (cname == '_mono')
        return 'continue';
        var cres = res[cname] = { cname: cname, period: period, total: 0 };
        if (opt.vat)
        assign(cres, { subtotal: 0, vat: 0 });
        if (opt.explain)
        cres.explain = [];
        E.t.for_each_month_period(period.from, period.to, function (mperiod) {
            var bill = E.calc_bill(ccdata, custs[cname], usage[cname],
            mperiod, opt);
            cres.total += bill.total;
            if (opt.vat && bill.subtotal > 0)
            cres.subtotal += bill.subtotal;
            if (opt.vat && bill.vat > 0)
            cres.vat += bill.vat;
            if (opt.explain)
            cres.explain.push(bill);
        });};for (var cname in custs) {var _ret = _loop(cname);if (_ret === 'continue') continue;
    }
    return custs._mono ? res[custs._mono] : res;
};

// same opts as calc_bill, minus precommit
E.calc_usage_cost = function (ccdata, custs, usage, period, opt) {
    ccdata = E.t.get_ccdata(ccdata);
    custs = E.t.get_customers(custs);
    usage = E.t.get_usage(usage, custs);
    period = E.t.get_period(period);
    opt = E.t.defaults(opt, { vat: 0, metric: 'bw_sum' });
    var res = {};
    for (var cname in custs)
    {
        if (cname == '_mono')
        continue;
        var _cres = { cname: cname, period: period, explain: opt.explain && {} };
        E.t.visit(ccdata, custs[cname], period, usage[cname], {
            zusage: E.t.usage_cost_cb(_cres, usage[cname], opt),
            global: opt.vat && E.t.vat_cb(_cres) });

        res[cname] = E.t.get_cost_result(_cres, opt);
    }
    return custs._mono ? res[custs._mono] : res;
};

// calc_glob_plan(ccdata|lib, cust[, d])
// output obj fields:
// - active: is billing active for the customer?
// - precommit: highest precommit of all active zones
// - disabled_prcm: highest precommit of all zones
// - prepaid, daily_precommit
// - credit, credit_line, pay_terms_days
// - vat
E.calc_glob_plan = function (ccdata, cust, d) {
    ccdata = E.t.get_ccdata(ccdata);
    d = d == null ? Date.now() : +date(d);
    var res = { active: 0, precommit: 0, disabled_prcm: 0 };
    var pr = E.t.search_hist(cust.pricing, d);
    if (!(res.active = +!!pr))
    pr = E.t.search_hist(cust.pricing, d, { any: 1 });
    Object.keys(cust.zones || {}).forEach(function (zid) {
        var zpr = E.calc_pricing(ccdata, cust, zid, d);
        if (zpr.prcm_valid)
        {
            if (zpr.active && zpr.precommit > res.precommit)
            res.precommit = zpr.precommit;
            if (zpr.precommit > res.disabled_prcm)
            res.disabled_prcm = zpr.precommit;
        }
    });
    res.prepaid = +!!(!pr || pr.prepaid);
    res.daily_precommit = +!!(res.prepaid && pr && pr.daily_precommit);
    res.credit_line = !res.prepaid && cust.credit_line || 0;
    res.pay_terms_days = !res.prepaid && cust.pay_terms_days || 0;
    res.vat = pr && pr.vat || 0;
    return res;
};

// calc_precommit(ccdata|lib, cust, d, opt)
// opt.fake_active: if customer is inactive and !fake_active, always return 0
// opt.fake_all_zones_enabled: ignore {disable} on zones
E.calc_precommit = function (ccdata, cust, d, opt) {
    ccdata = E.t.get_ccdata(ccdata);
    opt = E.t.defaults(opt, { fake_active: 1 });
    var gplan = E.calc_glob_plan(ccdata, cust, d);
    if (!gplan.active && !opt.fake_active)
    return 0;
    return opt.fake_all_zones_enabled ? gplan.disabled_prcm : gplan.precommit;
};

// calc_pricing(ccdata|lib, cust, zid|plan[, d])
// output obj fields:
// - active: is billing active for the zone?
// - prices: {gb, ip, domain, ...}
// - precommit
// - prcm_valid: see implementation
E.calc_pricing = function (ccdata, cust, plan, d) {
    ccdata = E.t.get_ccdata(ccdata);
    d = d == null ? Date.now() : +date(d);
    var res = { active: 0 },zid = void 0;
    // find plan
    if (typeof plan == 'string')
    {
        plan = E.t.search_hist(cust.zones[zid = plan].plans, d);
        if (!(res.active = +!!plan))
        plan = E.t.search_hist(cust.zones[zid].plans, d, { any: 1 });
    } else
    if (plan)
    res.active = +!(d < +date(plan.start || sot) || d >= +date(plan.end || eot));
    if (!plan)
    return assign(res, { prices: {}, precommit: 0, prcm_valid: 0 });
    res.active = +!!(res.active && !plan.disable && !plan.archive);
    // calc prices
    var zplan = E.t.calc_zusage(zid, plan, { start: eot, raw_start: eot },
    ccdata.lib).zplan;
    var rset = E.t.search_hist(E.t.calc_rulesets(ccdata, cust), d);
    if (!rset.cust_pricing && cust.pricing && cust.pricing.length)
    {
        var last = E.t.search_hist(cust.pricing, d, { last: 1 });
        rset.cust_pricing = last && last.base;
    }
    E.t.derive_prices(zplan, rset, ccdata.lib);
    res.prices = zplan.prices;
    res.precommit = zplan.prices.precommit || 0;
    var res_start = E.t.resident_start(cust);
    res.prcm_valid = +!!(!plan.archive &&
    d >= +date(plan.start) && d < +date(plan.end || eot) && (
    (plan.type || 'resident') == 'resident' ? d >= res_start : true));
    return res;
};

E.create_ccdata = function (lib, opt) {
    opt = E.t.defaults(opt, { cache: 1 });
    var cache = opt.cache && {};
    var ccdata = {
        clear_cache: function clear_cache(cname) {
            if (!cache)
            return;
            var cnames = cname ? [cname] : Object.keys(cache);
            cnames.forEach(function (k) {return delete cache[k];});
        },
        get_changepoints: function get_changepoints(cust, cachebust) {
            if (!cache)
            return E.t.calc_changepoints(ccdata, cust);
            var cname = cust.customer_name || cust.name;
            return !cachebust && cache[cname] || (
            cache[cname] = E.t.calc_changepoints(ccdata, cust));
        },
        site_rules: lib.pricing_rules,
        lib: lib };

    return ccdata;
};

// -- legacy standard --
E.calc = function (opt) {
    var ccdata = E.create_ccdata(opt.lib, { cache: 0 });
    opt.data = assign({}, opt.data);
    opt.data.from = +date(opt.data.from || opt.from);
    var full_period = E.t.get_period(opt);
    var multi_bill_res = E.calc_period_cost(ccdata, opt.customer, opt.data,
    full_period, E.t.opt_v1_to_v2(opt, { explain: 1 }));
    var res = assign({ zones: {}, sum: [0, 0] }, opt.explain ? { explain: '',
        details: { total: 0, subtotal: 0, vat: 0, periods: [] } } : null);
    Object.keys(opt.customer.zones || {}).forEach(function (zid) {
        var gbs = E.t.get_gbs(opt.data, zid, full_period.from, full_period.days, { metric: opt.metric || 'bw_sum' });
        res.sum[0] += gbs * util.GB;
        res.zones[zid] = [gbs * util.GB];
    });
    multi_bill_res.explain.forEach(function (v2_res, i) {
        res.sum[1] = round6(res.sum[1] + v2_res.total);
        v2_res.explain.usage.breakdown.forEach(function (bd) {
            res.zones[bd.zid][1] = round6((res.zones[bd.zid][1] || 0) + bd.cost);
        });
        if (opt.explain)
        {
            res.details.total += v2_res.total;
            res.details.subtotal += v2_res.subtotal || v2_res.total || 0;
            res.details.vat += v2_res.vat || 0;
            res.explain += (i && '\n\n' || '') + E.render_explain_string(v2_res,
            { precommit: +!!opt.precommit });
            Array.prototype.push.apply(res.details.periods,
            E.t.calc_v1_periods(v2_res, opt));
        }
    });
    if (opt.explain)
    {
        ['subtotal', 'vat', 'total'].forEach(function (k) {
            res.details[k] = round6(res.details[k]);});
    }
    return res;
};

E.t.opt_v1_to_v2 = function (v1, forced) {
    var v2 = { v1: v1, precommit: 1, vat: v1.vat, explain: v1.explain,
        metric: v1.metric };
    v2.plan_filter = !v1.zones ? v1.filter : function (zpl, zusg) {
        if (!v1.zones.includes(zusg.zid))
        return zpl;
        return !v1.filter || v1.filter(zpl);
    };
    return assign(v2, forced);
};

E.t.calc_v1_periods = function (res, opt) {
    var periods = [];
    var precommit_reached = !opt.precommit || !res.explain.precommit.sum ||
    res.explain.usage.sum >= res.explain.precommit.sum;
    // plans period
    var usg_sum = round6(res.explain.usage.sum);
    if (usg_sum)
    {
        var pl_period = { from: date(res.period.from), to: date(res.period.to),
            cost: usg_sum, plans: {}, committed: precommit_reached };
        res.explain.usage.breakdown.forEach(function (bd) {
            bd.items.forEach(function (it) {
                if (!round6(it.cost))
                return;
                var plan_it = void 0,key = it.plan.name + ':' + it.plan.prices;
                if (!(plan_it = pl_period.plans[key]))
                {
                    plan_it = pl_period.plans[key] = { name: it.plan.name,
                        cost: 0, bw: 0, cost_str: it.plan.prices, zones: [] };
                }
                plan_it.bw += it.type == 'gbs' ? it.qty : 0;
                plan_it.cost += it.cost;
                if (!plan_it.zones.includes(bd.zid))
                plan_it.zones.push(bd.zid);
            });
        });
        pl_period.plans = Object.values(pl_period.plans);
        pl_period.plans.forEach(function (plan_it) {
            plan_it.bw = round6(plan_it.bw);
            plan_it.cost = round6(plan_it.cost);
        });
        periods.push(pl_period);
    }
    // precommit period
    var pc_periods = {};
    res.explain.precommit.breakdown.forEach(function (bd) {
        var from = date.align(bd.from, 'MONTH');
        var pc_period = void 0,key = from.toISOString();
        if (!(pc_period = pc_periods[key]))
        {
            pc_period = { from: from, to: date.add(from, { month: 1 }), cost: 0,
                precommit: 0, committed: !!opt.precommit && !precommit_reached };
            periods.push(pc_periods[key] = pc_period);
        }
        pc_period.precommit += bd.cost;
    });
    Object.values(pc_periods).forEach(function (it) {
        it.precommit = round6(it.precommit);
        it.cost = it.committed ? it.precommit : usg_sum;
    });
    return periods;
};

E.get_precommit = function (opt) {
    opt = E.t.defaults(opt, { fake_active: 0 });
    return E.calc_precommit(opt.lib, opt.customer, opt.date, opt);
};

E.get_derived_cost = function (opt) {
    var pricing = E.calc_pricing(opt.lib, opt.customer, opt.plan || opt.zone,
    opt.date);
    return { cost: pricing.prices, precommit: pricing.precommit || 0 };
};

// -- non-standard (doesnt exist in plain.js) --

E.get_plan_name = function (plan) {
    var name = void 0;
    if (plan.cost != null && (!plan.type || plan.type == 'custom'))
    return plan.name ? util.ucfirst(plan.name) : 'Default';
    if (!{ resident: 1, static: 1 }[plan.type])
    return 'Custom';
    if (plan.type == 'resident')
    {
        name = { start: 'Starter', prod: 'Production', plus: 'Plus',
            high: 'High Volume' }[plan.name];
        if (!name)
        return 'Residential';
        if (plan.city)
        name += ' +city';
        if (plan.asn)
        name += ' +asn';
        if (plan.vip)
        name += ' +gIP';
        if (plan.vips != null)
        name += ' / ' + plan.vips + ' gIPs';
    } else

    {
        name = { dedicated: 'Dedicated', shared: 'Shared',
            selective: 'Dedicated domain' }[plan.ips_type];
        if (!name)
        return 'Custom';
        if (is_num(plan.ips))
        name += ' / ' + plan.ips + ' IPs';
        if (plan.exclusive_sec)
        name += ' / ' + date.dur_to_str(plan.exclusive_sec * ms.SEC) + ' excl';
        var dmns = util.get_count(plan.domain || plan.domain_whitelist);
        if (dmns)
        name += ' / ' + dmns + ' dmns';
    }
    return name;
};

E.cost2str = function (cost, opt) {
    if (!cost)
    return util.NA;
    var strs = [];
    if (cost.custom != null)
    strs.push(util.cost2str(cost.custom, opt));
    if (cost.gb)
    strs.push(util.cost2str(cost.gb, opt));
    if (cost.ip)
    strs.push(util.cost2str(cost.ip, assign({ unit: 'IP' }, opt)));
    if (cost.vip)
    strs.push(util.cost2str(cost.vip, assign({ unit: 'gIP' }, opt)));
    if (cost.domain)
    strs.push(util.cost2str(cost.domain, assign({ unit: 'Domain' }, opt)));
    if (cost.refresh)
    strs.push(util.cost2str(cost.refresh, assign({ unit: 'Refresh' }, opt)));
    if (cost.cooling)
    strs.push(util.cost2str(cost.cooling, assign({ unit: 'Cooling' }, opt)));
    return strs.join(', ');
};

E.run_rate = function (usage, xfrom, xto) {
    if (usage.runrated)
    return usage;
    var data = usage.data,from = +date(usage.from),to = +date(usage.recalc);
    xfrom = E.t.round_dt(xfrom, Math.floor);
    xto = E.t.round_dt(xto, Math.ceil);
    var xdata = {};
    for (var zid in data)
    {
        var zdata = data[zid],xzdata = xdata[zid] = {};
        for (var m in zdata)
        {
            if (!zdata[m] || !zdata[m].length)
            xzdata[m] = zdata[m];else

            xzdata[m] = E.t.extrapolate(zdata[m], from, to, xfrom, xto);
        }
    }
    return { data: xdata, from: usage.from, runrated: 1 };
};

E.t.extrapolate = function (arr, from, to, xfrom, xto) {
    if (!arr)
    return arr;
    var xfrom_i = (xfrom - from) / ms.DAY;
    if (xfrom_i < 0 || xfrom_i >= arr.length || xfrom > xto)
    throw new Error('Invalid extrapolation range: ' + xfrom + '-' + xto);
    var last_day_ms = to - (from + (arr.length - 1) * ms.DAY);
    if (last_day_ms < 0 || last_day_ms > ms.DAY)
    throw new Error('Invalid usage data');
    var xarr = arr.slice(0);
    if (xto > to)
    {
        if (last_day_ms > 0 && last_day_ms < ms.DAY)
        xarr[xarr.length - 1] *= ms.DAY / last_day_ms;
        var len = arr.length,xlen = (xto - from) / ms.DAY;
        var avg = E.t.sum_range(xarr, xfrom_i, len) / (len - xfrom_i);
        while (xarr.length < xlen) {
            xarr.push(avg);}
    }
    return xarr;
};

E.t.sum_range = function (arr, from, to) {
    return arr.reduce(function (acc, v, i) {return acc + (i >= from && i < to ? v : 0);}, 0);
};

// -- visit callbacks --

E.t.usage_cost_cb = function (res, usage, opt) {
    res.usg_cost = res.prcm_usg_cost = 0;
    if (opt.explain)
    res.explain.usage = { sum: 0, breakdown: [] };
    var calc_opt = { nl_gbs: {}, plan_filter: opt.plan_filter, v1: opt.v1 };
    return function (zusgs, zid, usg_from, usg_to) {
        var time_step = opt.daily ? ms.DAY : usg_to - usg_from;
        for (var from = usg_from; from < usg_to; from += time_step)
        {
            var to = from + time_step,d = (to - from) / ms.DAY;
            var gbs = E.t.get_gbs(usage, zid, from, d, opt);
            var cost = E.t.calc_zusg_cost(zusgs, d, gbs, calc_opt);
            res.usg_cost += cost.sum;
            res.prcm_usg_cost += cost.precommit ? cost.sum : 0;
            if (opt.explain)
            {
                res.explain.usage.sum = res.usg_cost;
                res.explain.usage.breakdown.push({
                    zid: zid, from: dstr(from), to: dstr(to), cost: cost.sum,
                    gbs: cost.active ? gbs : 0, active: cost.active,
                    items: cost.items });

            }
        }
    };
};

var ips_new_rule = function ips_new_rule(zusg, index) {
    if (index != 0 && zusg.ips_new != null)
    zusg = assign({}, zusg, { ips: zusg.ips_new });
    return zusg;
};

E.t.calc_zusg_cost = function (zusgs, d, gbs, opt) {
    if (E.t.is_legacy_zusgs(zusgs))
    return E.t.calc_legacy_zusg_cost(zusgs, d, gbs, opt);
    var gbs_item = { type: 'gbs', cost: 0, price: null, qty: gbs },gbs_zusg = void 0;
    var tmult = d / 30,pfilter = opt.plan_filter,it_cost = void 0,it_price = void 0,it_ipbw = void 0;
    var sum = 0,active = 0,items = [gbs_item],precommit = 0,index = 0;
    zusgs.forEach(function (zusg) {
        if (!zusg.active)
        return;
        zusg = ips_new_rule(zusg, index++);
        var zpl = zusg.zplan,pr = zpl.prices,filtered = void 0;
        var plan_desc = opt.v1 && { name: zusg.plan_name,
            prices: E.cost2str(zpl.prices) };
        if (!(filtered = pfilter && !pfilter(zpl, zusg)))
        active = 1;
        if (pr.precommit)
        precommit = 1;
        // bandwidth (max)
        it_cost = 0;
        it_price = null;
        it_ipbw = null;
        if (pr.gb > 0 || is_num(pr.gb) && !pr.ip_bw)
        {
            it_cost += pr.gb * gbs;
            it_price = pr.gb;
        } else
        if (pr.gb && opt && opt.nl_gbs)
        {
            var nlk = pr.gb.k,prev_gbs = opt.nl_gbs[nlk] || 0;
            it_cost += pr.gb(opt.nl_gbs[nlk] = prev_gbs + gbs) - pr.gb(prev_gbs);
            it_price = pr.gb.def;
        }
        if (pr.ip_bw > 0)
        it_cost += it_ipbw = (zusg.ips || 0) * pr.ip_bw * tmult;
        if (it_cost > gbs_item.cost || gbs_item.ipbw == null && (
        it_price != null || it_ipbw != null))
        {
            gbs_item.cost = it_cost;
            gbs_item.price = it_price;
            gbs_item.ipbw = !it_ipbw ? {} : { type: 'gbs_ipbw', cost: it_ipbw,
                price: pr.ip_bw, qty: 1, qmult: zusg.ips || 0, tmult: tmult };
            if (plan_desc)
            gbs_item.plan = gbs_item.ipbw.plan = plan_desc;
            gbs_zusg = zusg;
        }
        // non-bandwidth (sum)
        if (filtered)
        return;
        if (zpl.vip || is_num(pr.vip))
        {
            sum += it_cost = (zusg.vips || 0) * (pr.vip || 0) * tmult;
            items.push({ type: 'vips', cost: it_cost, price: pr.vip || 0,
                qty: zusg.vips || 0, tmult: tmult });
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.type == 'static' || is_num(pr.ip))
        {
            sum += it_cost = (zusg.ips || 0) * (pr.ip || 0) * tmult;
            items.push({ type: 'ips', cost: it_cost, price: pr.ip || 0,
                qty: zusg.ips || 0, tmult: tmult });
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.type == 'static' || is_num(pr.refresh))
        {
            sum += it_cost = (zusg.ips_new_refresh || 0) * (pr.refresh || 0);
            items.push({ type: 'ips_refresh', cost: it_cost,
                price: pr.refresh || 0, qty: zusg.ips_new_refresh || 0, tmult: 1 });
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.type == 'static' || is_num(pr.cooling))
        {
            var excl_day = get_excl(zusg.exclusive_sec);
            var ips_excl = get_ips_excl(zusg),expl_item = void 0;
            sum += it_cost = excl_day * (pr.cooling || 0) / 30 * ips_excl;
            items.push(expl_item = { type: 'exclusive', cost: it_cost,
                price: pr.cooling || 0, qty: ips_excl * excl_day, tmult: 1,
                explanation: [] });
            if (it_cost)
            {
                expl_item.explanation.push({ qty: excl_day, cost: it_cost,
                    price: pr.cooling, qmult: ips_excl });
            }
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.ips_type == 'selective' || is_num(pr.domain))
        {
            sum += it_cost = (zusg.dmns || 0) * (zusg.ips || 0) * (pr.domain || 0) * tmult;
            items.push({ type: 'dmns', cost: it_cost, price: pr.domain || 0,
                qty: zusg.dmns || 0, qmult: zusg.ips || 0, tmult: tmult });
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
    });
    if (gbs_zusg && pfilter && !pfilter(gbs_zusg.zplan, gbs_zusg))
    assign(gbs_item, { cost: 0, price: null, ipbw: null });
    sum += gbs_item.cost;
    if (gbs_item.ipbw && gbs_item.ipbw.cost)
    {
        gbs_item.cost -= gbs_item.ipbw.cost;
        items.splice(1, 0, gbs_item.ipbw);
    }
    delete gbs_item.ipbw;
    if (gbs_item.price == null)
    items.splice(0, 1);
    return { sum: sum, active: active, items: items, precommit: precommit };
};

E.t.get_gbs = function (usage, zid, from, d, opt) {
    if (!usage || !usage.from || !usage.data)
        return 0;
    var data = usage.data[zid] && usage.data[zid][opt.metric] || [];
    var i0 = (from - usage.from) / ms.DAY;
    var bytes = 0;
    for (var i = 0; i < d; i++) {
        // console.log(`遍历${i0} -- ${i}: ${data[i0 + i]}`)
        bytes += +data[i0 + i] || 0;
    }
    return bytes / util.GB;
};

E.t.precommit_cost_cb = function (res, opt) {
    res.prcm_cost = 0;
    if (opt.explain)
    res.explain.precommit = { sum: 0, breakdown: [] };
    var first_prcm = null,pfilter = opt.plan_filter;
    return function (zusgs, prcm_from, prcm_to) {
        if (!zusgs.length)
        return;
        var precommit = 0,zu_cnt = 0,zu_nof = zusgs.length,zu_mult = 0;
        zusgs.forEach(function (zusg) {
            if (!pfilter || pfilter(zusg.zplan, zusg))
            zu_mult = ++zu_cnt / zu_nof;
            precommit = Math.max(precommit, zusg.zplan.prices.precommit);
        });
        var time_step = opt.daily ? ms.DAY : prcm_to - prcm_from;
        var mo_len = opt.daily_precommit ? E.t.mo_len(prcm_from) : null;
        for (var from = prcm_from; from < prcm_to; from += time_step)
        {
            var to = from + time_step;
            var cost = void 0,mo_mult = void 0,daily_prcm0 = null;
            if (opt.daily_precommit)
            {
                cost = Math.floor(precommit / mo_len) * (to - from) / ms.DAY;
                mo_mult = cost / precommit;
                if (!first_prcm)
                {
                    first_prcm = precommit;
                    daily_prcm0 = precommit % mo_len;
                    cost += daily_prcm0;
                }
            } else

            {
                mo_mult = E.t.mo_mult(from, to);
                cost = precommit * mo_mult;
            }
            cost *= zu_mult;
            res.prcm_cost += cost;
            if (opt.explain)
            {
                res.explain.precommit.sum = res.prcm_cost;
                if (daily_prcm0)
                {
                    var prcm0_it = void 0;
                    res.explain.precommit.breakdown.push(prcm0_it = {
                        from: dstr(from), to: dstr(from + ms.DAY),
                        cost: Math.floor(precommit / mo_len) + daily_prcm0,
                        precommit: precommit, mo_mult: 1 / mo_len, daily_prcm0: daily_prcm0, zu_mult: zu_mult });

                    if (from + ms.DAY < to)
                    {
                        res.explain.precommit.breakdown.push({
                            from: dstr(from + ms.DAY), to: dstr(to),
                            cost: cost - prcm0_it.cost, precommit: precommit,
                            mo_mult: mo_mult - prcm0_it.mo_mult, zu_mult: zu_mult });

                    }
                } else

                {
                    res.explain.precommit.breakdown.push({
                        from: dstr(from), to: dstr(to), cost: cost,
                        precommit: precommit, mo_mult: mo_mult, zu_mult: zu_mult });

                }
            }
        }
    };
};

E.t.vat_cb = function (res) {
    res.vat = 0;
    return function (glob) {res.vat = glob.vat || 0;};
};

E.t.prepaid_cb = function (res) {
    res.prepaid = 0;
    return function (glob) {res.prepaid = +!!glob.prepaid || 0;};
};

E.t.multi_cb = function () {for (var _len = arguments.length, cbs = Array(_len), _key = 0; _key < _len; _key++) {cbs[_key] = arguments[_key];}
    cbs = cbs.filter(Boolean);
    if (cbs.length < 2)
    return cbs[0];
    return function () {for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {args[_key2] = arguments[_key2];}
        for (var i = 0; i < cbs.length; i++) {
            cbs[i].apply(null, args);}
    };
};

// -- visit core --

E.t.visit = function (ccdata, cust, period, usage, cbs) {
    var p_from = period.from,p_to = period.to;
    if (!usage || !usage.runrated)
    p_to = Math.min(p_to, E.t.round_dt(Date.now(), Math.floor) + ms.DAY);
    var glob_cb = cbs.global,lst_glob = void 0;
    var zusg_cb = cbs.zusage,lst_zusgs = {},zid = void 0,lst_zusg = void 0;
    var prcm_cb = cbs.precommit,lst_prcm = void 0;
    var cps = ccdata.get_changepoints(cust);
    for (var i = 0; i < cps.length; i++)
    {
        var cp = cps[i],nx_cp = cps[i + 1];
        if (nx_cp && nx_cp.ts <= p_from)
        continue;
        var ts = Math.max(p_from, Math.min(p_to, cp.ts));
        if (glob_cb && (!lst_glob || cp.glob != lst_glob[0] || ts == p_to))
        {
            if (lst_glob)
            glob_cb(lst_glob[0], lst_glob[1], ts);
            lst_glob = [cp.glob, ts];
        }
        if (zusg_cb)
        {
            if (ts == p_to)
            {
                for (zid in lst_zusgs) {
                    zusg_cb(lst_zusgs[zid][0], zid, lst_zusgs[zid][1], ts);}
            } else

            {
                for (zid in lst_zusgs)
                {
                    lst_zusg = lst_zusgs[zid];
                    if (lst_zusg[0] == (cp.zusages && cp.zusages[zid]))
                    continue;
                    zusg_cb(lst_zusg[0], zid, lst_zusg[1], ts);
                    delete lst_zusgs[zid];
                }
            }
            for (zid in cp.zusages)
            {
                var zusg = cp.zusages[zid];
                if (!lst_zusgs[zid] || zusg != lst_zusgs[zid][0])
                lst_zusgs[zid] = [zusg, ts];
            }
        }
        if (prcm_cb && (!lst_prcm || cp.prcm_zusages != lst_prcm[0] || ts == p_to))
        {
            if (lst_prcm)
            prcm_cb(lst_prcm[0], lst_prcm[1], ts);
            lst_prcm = [cp.prcm_zusages, ts];
        }
        if (ts == p_to)
        break;
    }
};

// each changepoint (cp) is a snapshot of how things are on a certain day
// - there *must* be a cp everytime something changes
// - there might be more cps than necessary (calling code must handle it)
// cp fields:
// - cp.ts: numeric timestamp (always rounded to day-resolution)
// - cp.glob: snapshot of customer-level info
//  => cp.glob[i] = {start, end, glob: {active, vat, prepaid}}
// - cp.zusages: snapshot of zone-level info (prices, ips, vips)
//  => cp.zusages[zid][i] = {zid, active, ips, vips, dmns, zplan}
//  => zplan = {start, end, prices: {gb, ip, vip, domain, refresh, precommit}}
// - cp.prcm_zusages: snapshot of zone-level precommit info
//  => cp.prcm_zusages[i] = <same as cp.zusages[zid][i]>
E.t.calc_changepoints = function (ccdata, cust) {
    var glob_cps = E.t.calc_glob_cps(ccdata, cust);
    var zone_cps = E.t.calc_zone_cps(ccdata, cust),zid = void 0;
    // find changepoint locations
    var tstr_to_cpi = {};
    function add_cps(items) {
        items.forEach(function (it) {
            tstr_to_cpi[new Date(it.start).toISOString()] = it.start;
            tstr_to_cpi[new Date(it.end).toISOString()] = it.end;
        });
    }
    add_cps([{ start: sot, end: eot }]);
    add_cps(glob_cps);
    for (zid in zone_cps) {
        add_cps(zone_cps[zid]);}
    var cps = Object.keys(tstr_to_cpi).sort().map(function (tstr, cpi) {
        var ts = tstr_to_cpi[tstr];
        tstr_to_cpi[tstr] = cpi;
        return { ts: ts, glob: { active: 0 }, zusages: {} };
    });
    // fill changepoint data
    glob_cps.forEach(function (gcp) {
        var cpi = tstr_to_cpi[new Date(gcp.start).toISOString()],cp = void 0;
        while ((cp = cps[cpi++]) && cp.ts < gcp.end) {
            cp.glob = gcp.glob;}
    });
    cps[cps.length - 1].glob = { active: 0 };
    for (zid in zone_cps)
    {
        zone_cps[zid].forEach(function (zcp) {
            if (!zcp.zusage)
            return;
            var cpi = tstr_to_cpi[new Date(zcp.start).toISOString()],cp = void 0;
            while ((cp = cps[cpi++]) && cp.ts < zcp.end)
            {
                if (!cp.glob.active)
                continue;
                var existing = cp.zusages[zid];
                if (existing == null)
                cp.zusages[zid] = zcp.zusage;else
                if (!Array.isArray(existing))
                cp.zusages[zid] = [existing, zcp.zusage];else

                cp.zusages[zid].push(zcp.zusage);
            }
        });
    }
    var lst_prcm_zusgs = [];
    cps.forEach(function (cp) {
        var prcm_zusgs = [];
        for (zid in cp.glob.active ? cp.zusages : {})
        {
            cp.zusages[zid].forEach(function (zusg) {
                if (zusg.active && zusg.zplan.prices.precommit)
                prcm_zusgs.push(zusg);
            });
        }
        var same = prcm_zusgs.length == lst_prcm_zusgs.length &&
        prcm_zusgs.every(function (zu, i) {return zu == lst_prcm_zusgs[i];});
        cp.prcm_zusages = same ? lst_prcm_zusgs : lst_prcm_zusgs = prcm_zusgs;
    });
    return cps;
};

E.t.calc_glob_cps = function (ccdata, cust) {
    var items = cust.pricing;
    if (!items || !items.length)
    return [{ start: sot, end: eot, glob: { active: 0 } }];
    var gcps = [],next = { start: eot, end: eot };
    var cust_end = cust.end ? E.t.round_dt(cust.end, Math.ceil) : eot;
    if (cust_end < eot)
    gcps.unshift(next = { start: cust_end, end: eot, glob: { active: 0 } });var _loop2 = function _loop2(
    i) {

        var it = items[i],cp = {};
        cp.start = E.t.round_dt(it.start, Math.floor);
        cp.end = it.end != null ? E.t.round_dt(it.end, Math.ceil) :
        cp.start == next.start ? cp.start + ms.DAY : next.start;
        var glob = cp.glob = { active: 1 };
        E.t.glob_fields.forEach(function (f) {
            if (it[f] != null)
            glob[f] = it[f];
        });
        if (cp.end <= next.start)
        {
            // [ cp ]  (hole)  [ next ] => [ cp ][ hole ][ next ]
            if (cp.end < next.start)
            {
                var hglob = assign({}, cp.glob, { active: 0 });
                gcps.unshift({ start: cp.end, end: next.start, glob: hglob });
            }
            gcps.unshift(cp);
        } else
        if (cp.start < next.start)
        {
            // { cp [ } next ] => [ cp ][ next ]
            cp.end = next.start;
            gcps.unshift(cp);
        }
        next = cp;};for (var i = items.length - 1; i >= 0; i--) {_loop2(i);
    }
    gcps.unshift({ start: sot, end: gcps[0].start, glob: { active: 0 } });
    return gcps;
};

E.t.glob_fields = 'prepaid vat'.split(/\s+/g);

E.t.calc_zone_cps = function (ccdata, cust) {
    if (E.t.uses_legacy_pricing(ccdata, cust))
    return E.t.calc_legacy_zone_cps(ccdata, cust);
    var zzcps = {};
    for (var zid in cust.zones)
    {
        var plans = cust.zones[zid].plans,plan = void 0;
        if (!plans || !plans.length)
        continue;
        var zcps = zzcps[zid] = [],nx_zcp = { raw_start: eot, start: eot };
        var nx_zplan = { raw_start: eot, start: eot };
        plans = add_inverse_plans(plans);
        for (var i = plans.length - 1; i >= 0; i--)
        {
            plan = plans[i];
            var zcp = { raw_start: plan.start };
            zcp.start = E.t.round_dt(plan.start, Math.floor);
            zcp.end = plan.end != null ? E.t.round_dt(plan.end, Math.ceil) :
            zcp.start == nx_zcp.start ? zcp.start + ms.DAY :
            E.t.round_dt(nx_zcp.raw_start, Math.ceil);
            zcp.zusage = E.t.calc_zusage(zid, plan, nx_zplan, ccdata.lib);
            nx_zplan = zcp.zusage.zplan;
            zcps.unshift(nx_zcp = zcp);
        }
    }
    return zzcps;
};

E.t.calc_zusage = function (zid, plan, nx_zplan, lib) {
    // We split plan in 2 objects: zusg, zplan. This reduces # of calls
    // to derive_prices by ignoring irrelevant changes (disable, vips...)
    var zusg = { zid: zid, active: +!plan.disable };
    var zplan = { raw_start: plan.start };
    zplan.start = E.t.round_dt(plan.start, Math.floor);
    zplan.end = plan.end != null ? E.t.round_dt(plan.end, Math.ceil) :
    nx_zplan && zplan.start == nx_zplan.start ? zplan.start + ms.DAY :
    E.t.round_dt(nx_zplan.raw_start, Math.ceil);
    // write zplan & zusg fields
    if (!E.t.is_legacy_pricing_plan(plan))
    {
        zplan.prices = assign({}, plan.cost);
        if (zplan.prices.gb != null)
        zplan.prices.gb = E.t.calc_gb_price(zplan.prices.gb, lib);
    } else

    {
        zplan.prices = {};
        if (plan.precommit != null)
        zplan.prices.precommit = plan.precommit;
        if (plan.cost != null)
        zplan.prices.gb = E.t.calc_gb_price(plan.cost, lib);
        zplan.legacy_pricing = 1;
        zplan.type = plan.type || 'resident';
    }
    for (var k in plan)
    {
        if (E.t.zusg_skips[k] || k in zplan)
        continue;
        (E.t.zusg_fields[k] ? zusg : zplan)[k] = plan[k];
    }
    if (E.t.is_dmn_plan(plan))
    {
        zusg.dmns_arr = util.get_arr(plan.domain || plan.domain_whitelist);
        zusg.dmns = zusg.dmns_arr.length;
        if (zplan.legacy_pricing)
        zplan.has_google = E.t.has_google_dmn(zusg.dmns_arr);
    }
    // finalize
    if (E.t.are_plans_same(zplan, nx_zplan))
    {
        nx_zplan.start = zplan.start;
        zplan = nx_zplan;
    }
    zusg.zplan = zplan;
    ['ips_new', 'ips_new_refresh', 'exclusive_sec', 'ips_excl'].forEach(function (p) {
        if (plan[p] != null)
        zusg[p] = plan[p];
    });
    zusg.plan_name = E.get_plan_name(plan);
    zusg.forEach = function (cb) {cb(this, 0);};
    return zusg;
};

E.t.zusg_skips = { start: 1, end: 1, disable: 1, country: 1, ips_new: 1,
    domain: 1, domain_whitelist: 1, precommit: 1, cost: 1, ips_new_refresh: 1,
    exclusive_sec: 1, ips_excl: 1 };

E.t.zusg_fields = { ips: 1, vips: 1 };

E.t.is_dmn_plan = function (pl) {return pl.type == 'static' && pl.ips_type == 'selective' ||
    pl.type == 'resident' && (pl.vips_type == 'domain' || pl.vips_type == 'domain_p');};

E.t.calc_gb_price = function (price, lib) {
    if (is_num(price) || price.k && price.def)
    return price;
    if (typeof price == 'string' && lib.cost[price] != null)
    price = lib.cost[price];
    if (is_num(price))
    return price;
    return assign(lib.to_func(price), { k: JSON.stringify(price), def: price });
};

// -- legacy pricing --

E.t.uses_legacy_pricing = function (ccdata, cust) {
    if (!ccdata.lib.new_pricing_model)
    return true;
    return Object.keys(cust.zones || {}).some(
    function (zid) {return (cust.zones[zid].plans || []).some(E.t.is_legacy_pricing_plan);});
};

E.t.is_legacy_pricing_plan = function (plan) {return !plan.type || plan.cost == null ||
    _typeof(plan.cost) != 'object' || !!plan.cost.steps || !!plan.cost.slide;};

// XXX igors: find way move ips_new_refresh to ips_new_rule
var add_inverse_plans = function add_inverse_plans(plans) {
    var res = [],once_time_field = ['ips_new_refresh', 'exclusive_sec'];
    // hack for day aligned plan start
    var calc_dend = function calc_dend(end) {
        return +date(end) - date.align(end, 'day') == 0 ? date.add(end,
        { ms: 1 }) : end;
    };
    plans.forEach(function (plan) {
        var more_day_plan = plan.end ? +date.align(plan.end, 'day') - date.
        align(plan.start, 'day') >= 1 : true;
        var once_fields = once_time_field.filter(function (f) {return plan[f] != null;});
        if (once_fields.length && more_day_plan)
        {
            var new_plan = assign(zutil.omit(plan, ['ips', 'ips_new']),
            { end: calc_dend(plan.start),
                ips_excl: plan.ips_new != null ? plan.ips_new : plan.ips });
            res.push(new_plan);
            plan = assign(zutil.omit(plan, once_fields));
        }
        res.push(plan);
    });
    return res;
};

E.t.calc_legacy_zone_cps = function (ccdata, cust) {
    if (!E.t.has_zusage(cust))
    return {};
    var rsets = E.t.calc_rulesets(ccdata, cust);
    var zzcps = {},i = void 0;
    for (var zid in cust.zones)
    {
        // build zcps & zplans from zone.plans
        var plans = cust.zones[zid].plans,plan = void 0;
        var zcps = [],zcp = void 0,nx_zcp = { start: eot, raw_start: eot };
        var zplans = [],zplan = void 0,nx_zplan = { start: eot, raw_start: eot };
        if (!plans || !plans.length)
        continue;
        plans = add_inverse_plans(plans);
        for (i = plans.length - 1; i >= 0; i--)
        {
            plan = plans[i];
            zcp = { raw_start: plan.start,
                start: E.t.round_dt(plan.start, Math.floor) };
            zcp.end = plan.end != null ? E.t.round_dt(plan.end, Math.ceil) :
            zcp.start == nx_zcp.start ? zcp.start + ms.DAY :
            E.t.round_dt(nx_zcp.raw_start, Math.ceil);
            zcp.zusage = E.t.calc_zusage(zid, plan, nx_zplan, ccdata.lib);
            if (zcp.zusage.zplan != nx_zplan)
            zplans.unshift(nx_zplan = zcp.zusage.zplan);
            zcps.unshift(nx_zcp = zcp);
        }
        // derive final prices & zcps using rulesets
        var derived_zcps = zzcps[zid] = [],irs = 0,izcp = 0;
        while (irs < rsets.length && rsets[irs].ts < zcps[0].start) {
            irs++;}
        for (i = 0; i < zplans.length; i++)
        {
            zplan = zplans[i];
            for (var rs = rsets[--irs]; rs && rs.ts < zplan.end; rs = rsets[++irs])
            {
                var derived_zplan = zplan,nx_rs = rsets[irs + 1];
                if (nx_rs && nx_rs.ts < zplan.end)
                {
                    derived_zplan = zutil.clone_deep(derived_zplan);
                    derived_zplan.end = zplan.start = nx_rs.ts;
                }
                E.t.derive_prices(derived_zplan, rs, ccdata.lib);
                while ((zcp = zcps[izcp]) && zcp.zusage.zplan == zplan &&
                zcp.end <= derived_zplan.end)
                {
                    zcp.zusage.zplan = derived_zplan;
                    derived_zcps.push(zcp);
                    izcp++;
                }
                if (zcp && zcp.zusage.zplan == zplan &&
                zcp.start < derived_zplan.end)
                {
                    var zcp_copy = { start: zcp.start };
                    zcp_copy.end = zcp.start = derived_zplan.end;
                    zcp_copy.zusage = assign({}, zcp.zusage);
                    zcp_copy.zusage.zplan = derived_zplan;
                    derived_zcps.push(zcp_copy);
                }
            }
        }
    }
    return zzcps;
};

E.t.calc_rulesets = function (ccdata, cust) {
    var rulesets = [{ ts: sot }];var _loop3 = function _loop3(
    tstr) {

        var tstr_data = ccdata.site_rules[tstr];
        var rs = { ts: E.t.round_dt(tstr, Math.floor),
            site_pricing: tstr_data.pricing_rules,
            site_precommit: tstr_data.precommit_rules };
        E.t.rs_fields.forEach(function (k) {rs[k] = !!tstr_data[k];});
        rulesets.push(rs);};for (var tstr in ccdata.site_rules) {_loop3(tstr);
    }
    [cust.base && cust.base.pricing, cust.pricing].forEach(function (base) {
        if (!base || !base.length)
        return;
        base.forEach(function (it, i) {
            var rules = it.base || it.list;
            rulesets.push({ ts: E.t.round_dt(it.start, Math.floor),
                cust_pricing: rules && rules.length ? rules : null });
        });
    });
    rulesets.sort(function (a, b) {return a.ts - b.ts;});
    // remove duplicates
    var del_count = 0,prev = rulesets[0];
    for (var i = 1; i < rulesets.length; i++)
    {
        var cur = rulesets[i];
        for (var k in prev) {
            cur[k] = cur[k] !== undefined ? cur[k] : prev[k];}
        if (cur.ts == prev.ts)
        del_count++;
        if (del_count > 0)
        rulesets[i - del_count] = cur;
        prev = cur;
    }
    if (del_count > 0)
    rulesets.length -= del_count;
    return rulesets;
};

E.t.rs_fields = ['plan_cost_overrides_all', 'free_shared_vips',
'legacy_ip_cost'];

E.t.has_google_dmn = function (domains) {
    if (!domains || !domains.length)
    return false;
    // copied from agent_conf.js
    var google_hosts = ['youtube.com', 'googleapis.com',
    'googleusercontent.com', 'googlecommerce.com',
    'gstatic.com', 'gred2.seojeans.com', 'rushsolution.com',
    'a.cpmwizard.com', 'b.cpmwizard.com',
    'googleadservices.com', 'googlesyndication.com',
    'appspot.com', '2mdn.net', 'youtube-nocookie.com',
    'gvt1.com', 'ytimg.com', 'invitemedia.com',
    'googlecode.com', 'goo.gl', 'ggpht.com', 'blogspot.com',
    'dartsearch.net', 'android.com', 'googlevideo.com',
    'youtu.be', 'googledrive.com',
    'adsensecustomsearchads.com'];
    return domains.some(function (dmn) {
        var no_tld = dmn.substr(0, dmn.lastIndexOf('.'));
        var no_2ld = no_tld.substr(0, no_tld.lastIndexOf('.'));
        return no_tld == 'google' || no_tld.endsWith('.google') ||
        no_2ld == 'google' || no_2ld.endsWith('.google') ||
        google_hosts.includes(dmn);
    });
};

E.t.derive_prices = function (zplan, ruleset, lib) {
    if (!zplan.legacy_pricing)
    return;
    var cust_pr = void 0,site_pr = void 0,site_pc = void 0,match = void 0;
    if (ruleset)
    {
        if ((match = util.match(ruleset.cust_pricing, zplan)) && match.cost)
        {
            cust_pr = {};
            for (var k in match.cost)
            {
                if (E.t.prices_fields[k])
                cust_pr[k] = match.cost[k];
            }
        }
        if (!ruleset.plan_cost_overrides_all || !zplan.prices ||
        zplan.prices.gb == null)
        {
            if (match = util.match(ruleset.site_pricing, zplan))
            site_pr = match.cost;
            if (match = util.match(ruleset.site_precommit, zplan))
            site_pc = match.cost;
        }
        if (ruleset.free_shared_vips && site_pr && zplan.vip &&
        zplan.vips_type == 'shared')
        {
            site_pr = assign({}, site_pr, { vip: 0, refresh: 0 });
        }
    }
    var cpr_overr = cust_pr && cust_pr.cost_override;
    zplan.prices = assign({}, site_pc, site_pr, !cpr_overr && cust_pr,
    zplan.prices, cpr_overr && cust_pr, zplan.cost_override,
    zplan.auto_cost_override);
    if (zplan.prices.gb != null && !is_num(zplan.prices.gb))
    zplan.prices.gb = E.t.calc_gb_price(zplan.prices.gb, lib);
    // XXX philippe: hack for specific customers, will become obsolete
    // when new pricing system is implemented
    if (is_num(zplan.prices.sneaker_vip))
    {
        if ((zplan.special_domain || {}).name == 'sneaker')
        zplan.prices.vip = zplan.prices.sneaker_vip;
        delete zplan.prices.sneaker_vip;
    }
    if (is_num(zplan.prices.google_ip))
    {
        if ((zplan.special_domain || {}).name == 'google')
        zplan.prices.ip = zplan.prices.google_ip;
        delete zplan.prices.google_ip;
    }
    if (ruleset && ruleset.legacy_ip_cost)
    {
        zplan.legacy_ip_cost = 1;
        if (!zplan.prices.ip && zplan.prices.ip_bw)
        zplan.prices.ip_bw = 0;
    }
    var price_fields = [];
    if (zplan.type == 'resident')
    price_fields.push('precommit', 'gb', 'vip', 'refresh');else
    if (zplan.type == 'static')
    {
        price_fields.push('precommit', 'gb', 'ip');
        if (!zplan.ip_alloc_preset)
        price_fields.push('ip_bw');
        if (zplan.ips_type == 'selective')
        price_fields.push('domain');
        if (!zplan.ip_alloc_preset)
        {
            price_fields.push('refresh', 'cooling');
            if (zplan.prices.cooling == null && zplan.prices.ip != null)
            zplan.prices.cooling = zplan.prices.ip;
        }
    }
    if (!zplan.allow_abnormal_prices)
    {
        var final_prices = {};
        price_fields.forEach(function (k) {return final_prices[k] = zplan.prices[k] || 0;});
        zplan.prices = final_prices;
    }
    return zplan;
};

E.t.prices_fields = { gb: 1, ip: 1, ip_bw: 1, domain: 1, vip: 1, precommit: 1,
    sneaker_vip: 1, google_ip: 1, cost_override: 1, cooling: 1 };

var get_excl = function get_excl(exclusive_sec) {return Math.trunc((exclusive_sec || 0) / 86400);};

var get_ips_excl = function get_ips_excl(zusg) {
    var added_ips = ['ips_excl', 'ips_new', 'ips'].map(function (p) {return zusg[p];}).
    find(function (p) {return p != null;});
    return (added_ips || 0) + (zusg.ips_new_refresh || 0);
};

// -- legacy computation --

E.t.is_legacy_zusgs = function (zusgs) {
    return zusgs.some && zusgs.some(function (zu) {return zu.zplan.legacy_ip_cost;});};

E.t.get_plan_uniq_key = function (plan) {return ['type', 'ips_type', 'pool_ip_type',
    'ip_alloc_preset', 'bandwidth'].map(function (key) {return plan[key] || '';}).join('_');};

E.t.calc_legacy_zusg_cost = function (zusgs, d, gbs, opt) {
    var costs = [],groups = {},tmult = d / 30,pfilter = opt.plan_filter;
    var index = 0;
    zusgs.forEach(function (zusg) {
        if (!zusg.active)
        return;
        zusg = ips_new_rule(zusg, index++);
        var gk = E.t.get_plan_uniq_key(zusg.zplan);
        var group = void 0,it = void 0;
        if (group = groups[gk])
        {
            if (group.ipbw_item && zusg.ips)
            {
                it = group.ipbw_item;
                group.cost.sum -= it.cost;
                it.qmult += zusg.ips;
                it.cost = it.price * it.qty * it.qmult * it.tmult;
                group.cost.sum += it.cost;
            }
            if (group.ips_item && zusg.ips)
            {
                it = group.ips_item;
                group.cost.sum -= it.cost;
                it.qty += zusg.ips;
                it.cost = it.price * it.qty * it.tmult;
                group.cost.sum += it.cost;
            }
            if (group.ips_refresh_item && zusg.ips_new_refresh)
            {
                it = group.ips_refresh_item;
                group.cost.sum -= it.cost;
                it.qty += zusg.ips_new_refresh;
                it.cost = it.price * it.qty * it.tmult;
                group.cost.sum += it.cost;
            }
            if (group.exclusive_item && get_excl(zusg.exclusive_sec))
            {
                it = group.exclusive_item;
                group.cost.sum -= it.cost;
                var excl_day = get_excl(zusg.exclusive_sec);
                var ips_excl = get_ips_excl(zusg),part_qty = void 0,part_cost = void 0;
                it.qty += part_qty = excl_day * ips_excl;
                it.cost += part_cost = it.price / 30 * part_qty * it.tmult;
                group.cost.sum += it.cost;
                if (part_cost)
                {
                    it.explanation.push({ cost: part_cost, qty: excl_day,
                        qmult: ips_excl, price: it.price });
                }
            }
            if (group.dmns_item && zusg.dmns && zusg.ips)
            {
                it = group.dmns_item;
                group.cost.sum -= it.cost;
                zusg.dmns_arr.forEach(function (v) {
                    group.dmns[v] = 1;});
                it.qty = Object.keys(group.dmns).length;
                it.qmult += zusg.ips;
                it.cost = it.price * it.qty * it.qmult * it.tmult;
                group.cost.sum += it.cost;
            }
            return;
        }
        var cost = void 0,sum = 0,items = [],ipbw_item = void 0,ips_item = void 0,dmns_item = void 0,it_cost = void 0;
        var zpl = zusg.zplan,pr = zpl.prices,ips_refresh_item = void 0;
        var plan_desc = !opt.v1 ? undefined : { name: zusg.plan_name,
            prices: E.cost2str(zpl.prices) };
        var exclusive_item = void 0;
        // bandwidth
        if (pr.gb > 0 || is_num(pr.gb) && !pr.ip_bw)
        {
            sum += it_cost = pr.gb * gbs;
            items.push({ type: 'gbs', cost: it_cost, price: pr.gb, qty: gbs });
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        } else
        if (pr.gb && opt && opt.nl_gbs)
        {
            var nlk = pr.gb.k,pv_gbs = opt.nl_gbs[nlk] || 0;
            sum += it_cost = pr.gb(opt.nl_gbs[nlk] = pv_gbs + gbs) - pr.gb(pv_gbs);
            items.push({ type: 'gbs', cost: it_cost, price: pr.gb.def,
                qty: gbs });
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (pr.ip_bw > 0)
        {
            sum += it_cost = (zusg.ips || 0) * pr.ip_bw * tmult;
            ipbw_item = { type: 'gbs_ipbw', cost: it_cost, price: pr.ip_bw,
                qty: 1, qmult: zusg.ips || 0, tmult: tmult };
            items.push(ipbw_item);
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        // non-bandwidth
        if (is_num(pr.vip))
        {
            sum += it_cost = (zusg.vips || 0) * pr.vip * tmult;
            items.push({ type: 'vips', cost: it_cost, price: pr.vip,
                qty: zusg.vips || 0, tmult: tmult });
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.type == 'static' || is_num(pr.ip))
        {
            sum += it_cost = (zusg.ips || 0) * (pr.ip || 0) * tmult;
            ips_item = { type: 'ips', cost: it_cost, price: pr.ip || 0,
                qty: zusg.ips || 0, tmult: tmult };
            items.push(ips_item);
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.type == 'static' || is_num(pr.refresh))
        {
            sum += it_cost = (zusg.ips_new_refresh || 0) * (pr.refresh || 0);
            ips_refresh_item = { type: 'ips_refresh', cost: it_cost,
                price: pr.refresh || 0, qty: zusg.ips_new_refresh || 0, tmult: 1 };
            items.push(ips_refresh_item);
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.type == 'static' || is_num(pr.cooling))
        {
            var _excl_day = get_excl(zusg.exclusive_sec);
            var _ips_excl = get_ips_excl(zusg);
            sum += it_cost = _excl_day * (pr.cooling || 0) / 30 * _ips_excl;
            exclusive_item = { type: 'exclusive', cost: it_cost, tmult: 1,
                price: pr.cooling || 0, qty: _excl_day * _ips_excl, explanation: [] };
            items.push(exclusive_item);
            if (it_cost)
            {
                exclusive_item.explanation.push({ qty: _excl_day, cost: it_cost,
                    price: pr.cooling, qmult: _ips_excl });
            }
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        if (zpl.ips_type == 'selective' || is_num(pr.domain))
        {
            sum += it_cost = (zusg.dmns || 0) * (zusg.ips || 0) * (pr.domain || 0) * tmult;
            dmns_item = { type: 'dmns', cost: it_cost, price: pr.domain || 0,
                qty: zusg.dmns || 0, qmult: zusg.ips || 0, tmult: tmult };
            items.push(dmns_item);
            if (plan_desc)
            items[items.length - 1].plan = plan_desc;
        }
        // finalize
        costs.push(cost = { sum: sum, active: 1, items: items, precommit: +!!pr.precommit });
        if (pfilter && !pfilter(zusg.zplan, zusg))
        cost.filtered = 1;
        if (zusg.zplan.type == 'static')
        {
            groups[gk] = { cost: cost, ipbw_item: ipbw_item, ips_item: ips_item,
                dmns_item: dmns_item, pr: pr, ips_refresh_item: ips_refresh_item,
                exclusive_item: exclusive_item };
            groups[gk].dmns = (zusg.dmns_arr || []).reduce(function (acc, v) {
                return (acc[v] = 1) && acc;}, {});
        }
    });
    // pick max
    var max_cost = costs.reduce(function (acc, cost) {
        if (cost.sum > acc.sum || !acc.sum && !acc.items.length)
        return cost;
        return acc;
    }, { sum: 0, active: 0, items: [] });
    return max_cost.filtered ? { sum: 0, active: 0, items: [] } : max_cost;
};

// -- explain string --

E.render_explain_string = function (res, opt) {
    opt = E.t.defaults(opt, { precommit: 1, usage: 1 });
    var str = '';
    if (E.t.is_full_month_period(res.period))
    str += '[' + date.strftime('%B %Y', res.period.from) + ']';else
    if (+date(res.period.from) == +date(res.period.to))
    str += '[' + res.period.from + ']';else

    str += '[' + res.period.from + ' to ' + dstr(date(res.period.to) - ms.DAY) + ']';
    if (res.explain.usage && res.explain.usage.sum && opt.usage)
    {
        E.t.prune_usg_bd(res.explain.usage.breakdown).forEach(function (bd) {
            var bd_from = +date(bd.from),bd_to = +date(bd.to) - ms.DAY;
            str += '\nzone ' + bd.zid + ', ' + date.strftime('%b %e', bd_from) + (
            bd_to == bd_from ? '' : ' to ' + date.strftime('%b %e', bd_to)) +
            ': ' + cash_str(bd.cost);
            var bd_items = bd.items.reduce(function (acc, it) {
                if (it.cost)
                (acc[it.type] || (acc[it.type] = [])).push(it);
                return acc;
            }, {});
            (bd_items.gbs || []).forEach(function (it) {
                str += '\n  GBs: ' + cash_str(it.cost) + ' ' + ('(' +
                round2(it.qty) + ' GBs @ ' + it.price + ' $/GB)');
            });
            (bd_items.gbs_ipbw || []).forEach(function (it) {
                str += '\n  Unlimited GBs: ' + cash_str(it.cost) + ' ' + ('(' +
                it.qmult + ' IPs x ' + round2(it.tmult * 30) + ' days ') + ('@ ' +
                it.price + ' $/IP/30 days)');
            });
            (bd_items.vips || []).forEach(function (it) {
                str += '\n  gIPs: ' + cash_str(it.cost) + ' ' + ('(' +
                it.qty + ' gIPs x ' + round2(it.tmult * 30) + ' days ') + ('@ ' +
                it.price + ' $/gIP/30 days)');
            });
            (bd_items.ips || []).forEach(function (it) {
                str += '\n  IPs: ' + cash_str(it.cost) + ' ' + ('(' +
                it.qty + ' IPs x ' + round2(it.tmult * 30) + ' days ') + ('@ ' +
                it.price + ' $/IP/30 days)');
            });
            (bd_items.ips_refresh || []).forEach(function (it) {
                var days = it.tmult > 1 ? it.tmult + ' days x ' : '';
                str += '\n  IPs refresh: ' + cash_str(it.cost) + ' ' + ('(' +
                it.qty + ' IPs x ' + days + it.price + ' $/IP)');
            });
            (bd_items.exclusive || []).forEach(function (row) {
                var items = row.explanation || [row];
                (items || []).forEach(function (it) {
                    var price = row.tmult > 1 ? row.cost : it.cost;
                    var days = row.tmult > 1 ? 'x ' + row.tmult + ' days ' : '';
                    str += '\n  Cooling period: ' + cash_str(price) + ' ' + ('(' +
                    it.qty + ' Cooling days ' + days + 'x ' + it.qmult + ' IPs @ ') + (
                    it.price + ' $/IP/30)');
                });
            });
            (bd_items.dmns || []).forEach(function (it) {
                var t = round2(it.tmult * 30);
                str += '\n  Domains: ' + cash_str(it.cost) + ' ' + ('(' +
                it.qty + ' dmns x ' + it.qmult + ' IPs x ' + t + ' days ') + ('@ ' +
                it.price + ' $/dmn/IP/30 days)');
            });
        });
        str += '\nusage sum: ' + cash_str(res.explain.usage.sum) + '\n';
    }
    if (res.explain.precommit && res.explain.precommit.sum && opt.precommit)
    {
        var dly = res.explain.precommit.breakdown.some(function (v) {return v.daily_prcm0 != null;});
        E.t.prune_prcm_bd(res.explain.precommit.breakdown).forEach(function (bd) {
            var bd_from = +date(bd.from),bd_to = +date(bd.to) - ms.DAY;
            str += '\nprecommit, ' + date.strftime('%b %e', bd_from) + (
            bd_to == bd_from ? '' : ' to ' + date.strftime('%b %e', bd_to));
            var mo_len = E.t.mo_len(bd.from);
            var mo_mult = bd.mo_mult;
            var d = round0(mo_mult * mo_len);
            if (!dly)
            str += ' (' + d + '/' + mo_len + '=' + round4(mo_mult) + ' month)';
            str += '\n  cost: ' + cash_str(bd.cost);
            if (!bd.cost)
            str += ' (no precommit)';else
            if (!dly)
            str += ' (' + round4(mo_mult) + ' month @ ' + bd.precommit + ' $/month)';else

            {
                var dly_prcm = (bd.cost - (bd.daily_prcm0 || 0)) / d;
                str += ' (' + d + ' days @ ' + dly_prcm + ' $/day' + (
                bd.daily_prcm0 ? ' + $' + bd.daily_prcm0 : '') + ')';
            }
        });
        str += '\nprecommit sum: ' + cash_str(res.explain.precommit.sum) + '\n';
    }
    if (res.explain.vat)
    {
        str += '\nSubtotal: ' + cash_str(res.subtotal) + ('\nVAT ' +
        res.explain.vat + '%: ' + cash_str(res.vat));
    }
    return str + ('\nTotal: ' + cash_str(res.total));
};

E.t.prune_usg_bd = function (bd) {
    bd = bd.slice(0);
    bd.sort(function (a, b) {return a.zid.localeCompare(b.zid) || +date(a.from) - date(b.from);});
    var del_count = 0,prev = bd[0],merged_its = void 0;
    for (var i = 1, cur = bd[i]; i < bd.length; i++, cur = bd[i])
    {
        if (merged_its = E.t.get_merged_its(merged_its, prev, cur))
        {
            if (!prev.merged)
            prev = bd[i - 1 - del_count] = assign({ merged: 1 }, prev);
            prev.to = cur.to;
            prev.cost = round6(prev.cost + cur.cost);
            prev.items = merged_its.arr;
            del_count++;
        } else

        {
            bd[i - del_count] = cur;
            prev = cur;
        }
    }
    bd.length -= del_count;
    return bd.filter(function (it) {return it.cost;});
};

E.t.get_merged_its = function (merged_its, prev, cur) {
    if (cur.zid != prev.zid || +date(cur.from) != +date(prev.to))
    return null;
    if (cur.items.length != prev.items.length)
    return null;
    if (!merged_its)
    {
        merged_its = { arr: [] };
        for (var i = 0; i < prev.items.length; i++)
        {
            var _it = prev.items[i];
            if (merged_its[_it.type])
            return null;
            merged_its.arr.push(merged_its[_it.type] = assign({}, _it));
        }
    }
    var post_actions = [];
    var add_post = function add_post(it, mit, cb) {return post_actions.push(function () {return cb(it, mit);});};
    for (var _i = 0; _i < cur.items.length; _i++)
    {
        var _it2 = cur.items[_i],mit = void 0;
        if (!(mit = merged_its[_it2.type]))
        return null;
        if (!_it2.tmult)
        {
            if (_it2.price != mit.price)
            return null;
            add_post(_it2, mit, function (p_it, p_mit) {
                p_mit.cost = round6(p_mit.cost + p_it.cost);
                p_mit.qty = round6(p_mit.qty + p_it.qty);
            });
        } else

        {
            if (_it2.price != mit.price || _it2.qty != mit.qty || _it2.qmult != mit.qmult)
            return null;
            add_post(_it2, mit, function (p_it, p_mit) {
                p_mit.cost = round6(p_mit.cost + p_it.cost);
                p_mit.tmult = round6(p_mit.tmult + p_it.tmult);
            });
        }
    }
    post_actions.forEach(function (cb) {return cb();});
    return merged_its;
};

E.t.prune_prcm_bd = function (bd) {
    bd = bd.slice(0);
    bd.sort(function (a, b) {return +date(a.from) - date(b.from);});
    var del_count = 0,prev = bd[0];
    for (var i = 1, cur = bd[i]; i < bd.length; i++, cur = bd[i])
    {
        if (+date(cur.from) == +date(prev.to) && cur.precommit == prev.precommit &&
        cur.zu_mult == prev.zu_mult && cur.daily_prcm0 == prev.daily_prcm0)
        {
            if (!prev.merged)
            prev = bd[i - 1 - del_count] = assign({ merged: 1 }, prev);
            prev.to = cur.to;
            prev.cost = round6(prev.cost + cur.cost);
            prev.mo_mult = round6(prev.mo_mult + cur.mo_mult);
            del_count++;
        } else

        {
            bd[i - del_count] = cur;
            prev = cur;
        }
    }
    bd.length -= del_count;
    return bd.filter(function (it) {return it.cost;});
};

// -- factory fns --

E.t.get_cost_result = function (res, opt) {
    var prcm0 = opt.v1 && !opt.v1.precommit;
    var prcm_extra = prcm0 ? 0 : E.t.calc_prcm_extra(res, opt);
    var subtotal = (res.usg_cost || 0) + prcm_extra;
    var total = res.vat > 0 ? subtotal * (1 + res.vat / 100) : subtotal;
    var ret = { cname: res.cname, period: { from: dstr(res.period.from),
            to: dstr(res.period.to) }, total: round6(total) };
    if (opt.vat)
    assign(ret, { subtotal: round6(subtotal), vat: round6(total - subtotal) });
    if (opt.explain)
    ret.explain = res.explain;
    if (opt.explain && opt.vat)
    ret.explain.vat = res.vat || 0;
    if (opt.explain && opt.daily)
    {
        ret.daily_cost = E.t.calc_daily_cost(res, prcm_extra);
        ret.daily_gbs = E.t.calc_daily_gbs(res);
    }
    if (opt.plan_filter)
    {
        var nof_subtotal = prcm0 ? res.nof.usg_cost :
        Math.max(res.nof.usg_cost || 0, res.nof.prcm_cost || 0);
        ret.filter_pct = nof_subtotal && round6(subtotal / nof_subtotal);
    }
    return ret;
};

E.t.calc_prcm_extra = function (res, opt) {
    if (!opt.plan_filter)
    return Math.max(0, (res.prcm_cost || 0) - (res.usg_cost || 0));
    var nof_xprcm = Math.max(0, (res.nof.prcm_cost || 0) - (res.nof.usg_cost || 0));
    if (!nof_xprcm)
    return 0;
    if (!res.nof.prcm_usg_cost)
    return round6(nof_xprcm * (res.prcm_cost || 0) / res.nof.prcm_cost);
    return round6(nof_xprcm * (res.prcm_usg_cost || 0) / res.nof.prcm_usg_cost);
};

E.t.calc_daily_cost = function (res, prcm_extra) {
    var d0 = res.period.from,n = (res.period.to - d0) / ms.DAY,i = void 0;
    var daily = [];
    for (i = 0; i < n; i++) {
        daily[i] = 0;}
    res.explain.usage.breakdown.forEach(function (bd) {
        var idx = (+date(bd.from) - d0) / ms.DAY;
        daily[idx] += bd.cost;
    });
    if (prcm_extra)
    {
        var prcm_days = res.explain.precommit.breakdown.length;
        res.explain.precommit.breakdown.forEach(function (bd) {
            var idx = (+date(bd.from) - d0) / ms.DAY;
            daily[idx] += prcm_extra * 1 / prcm_days;
        });
    }
    if (res.vat)
    {
        for (i = 0; i < n; i++) {
            daily[i] *= 1 + res.vat / 100;}
    }
    return daily;
};

E.t.calc_daily_gbs = function (res) {
    var d0 = res.period.from,n = (res.period.to - d0) / ms.DAY,i = void 0;
    var daily = [];
    for (i = 0; i < n; i++) {
        daily[i] = 0;}
    res.explain.usage.breakdown.forEach(function (bd) {
        daily[(+date(bd.from) - d0) / ms.DAY] += bd.gbs;});
    return daily;
};

E.t.get_ccdata = function (ccdata) {
    if (ccdata.get_changepoints || ccdata.$ccdata$)
    return ccdata;
    return E.create_ccdata(ccdata, { cache: 0 });
};

E.t.get_customers = function (custs) {
    var cname = custs ? custs.customer_name || custs.name : null;
    if (!custs || !cname && !custs.pricing && !custs.zones)
    return custs || {};
    var res = { _mono: cname || 'nil' };
    res[res._mono] = custs;
    return res;
};

E.t.get_usage = function (usage, custs) {
    if (!usage)
    return {};
    if (custs._mono && usage.from)
    {
        var mono = usage;
        usage = {};
        usage[custs._mono] = mono;
    }
    for (var cname in usage)
    {
        var cusage = usage[cname] = assign({}, usage[cname]);
        cusage.from = cusage.from != null ? +date(cusage.from) : 0;
        cusage.data = cusage.data || {};
    }
    return usage;
};

E.t.get_period = function (val) {
    var from = void 0,to = void 0;
    if (val != null && val.from != null)
    {
        from = E.t.round_dt(val.from, Math.floor);
        to = E.t.round_dt(val.to || val.until || Date.now(), Math.ceil);
        if (from >= to)
        throw new Error('Invalid period: ' + JSON.stringify(val));
    } else

    {
        from = E.t.round_dt(val || Date.now(), Math.floor);
        to = from + ms.DAY;
    }
    return { from: from, to: to, days: (to - from) / ms.DAY };
};

E.t.get_bill_period = function (val) {
    var from = void 0,to = void 0;
    if (val != null && val.from != null)
    {
        from = E.t.round_dt(val.from, Math.floor);
        to = E.t.round_dt(val.to || val.until || Date.now(), Math.ceil);
        if (from >= to)
        throw new Error('Invalid period: ' + JSON.stringify(val));
    } else

    {
        var dt = new Date(E.t.round_dt(val || Date.now(), Math.floor));
        dt.setUTCDate(1);
        from = +dt;
        dt.setUTCMonth(dt.getUTCMonth() + 1);
        to = +dt;
    }
    return { from: from, to: to, days: (to - from) / ms.DAY };
};

// -- utils --

E.t.are_plans_same = function (plan1, plan2) {
    if (plan1 == null || plan2 == null)
    return plan1 == plan2;
    var kcnt1 = Object.keys(plan1).length - ('end' in plan1 ? 1 : 0);
    var kcnt2 = Object.keys(plan2).length - ('end' in plan2 ? 1 : 0);
    if (kcnt1 != kcnt2)
    return false;
    for (var k in plan1)
    {
        if (k == 'start' || k == 'raw_start' || k == 'end')
        continue;
        var v1 = plan1[k],t1 = typeof v1 === 'undefined' ? 'undefined' : _typeof(v1),v2 = plan2[k],t2 = typeof v2 === 'undefined' ? 'undefined' : _typeof(v2);
        var eq = t1 == 'string' || t2 == 'string' ? v1 === v2 :
        v1 == null || v2 == null || t1 != 'object' || t2 != 'object' ? v1 == v2 :
        zutil.equal_deep(v1, v2);
        if (!eq)
        return false;
    }
    return true;
};

E.t.has_zusage = function (cust) {
    if (!cust || !cust.zones)
    return false;
    return Object.keys(cust.zones).some(function (zid) {
        var pls = cust.zones[zid].plans;
        return pls && pls.length;
    });
};

E.t.resident_start = function (cust) {return Math.min(+date(cust.resident || eot),
    +date(cust.inited && cust.inited.residential_payment || eot));};

E.t.search_hist = function (arr, d, opt) {
    if (!arr || !arr.length)
    return;
    var nx_start = eot,ignore_end = opt && (opt.last || opt.any);
    for (var i = arr.length - 1, _it3 = arr[i]; i >= 0; i--, _it3 = arr[i])
    {
        var start = E.t.round_dt(_it3.start || _it3.ts, Math.floor);
        if (d >= start)
        {
            var end = _it3.end != null ? E.t.round_dt(_it3.end, Math.ceil) :
            start == nx_start ? start + ms.DAY : nx_start;
            return d < end || ignore_end ? _it3 : undefined;
        }
        nx_start = start;
    }
    return opt && opt.any ? arr[0] : undefined;
};

E.t.for_each_month_period = function (from, to, cb) {
    var dt = date(from, true);
    to = +date(to);
    while (+dt < to) // eslint-disable-line no-unmodified-loop-condition
    {
        var period = { from: +dt };
        period.to = Math.min(to, dt.setUTCMonth(dt.getUTCMonth() + 1, 1));
        cb(period);
    }
};

E.t.mo_mult = function (from, to) {
    var mult = 0,ts = void 0;
    var from_dt = new Date(from),to_mo = new Date(to - ms.DAY).getUTCMonth();
    while (from_dt.getUTCMonth() != to_mo)
    {
        from_dt.setUTCMonth(from_dt.getUTCMonth() + 1, 0);
        ts = +from_dt + ms.DAY;
        mult += (ts - from) / ms.DAY / from_dt.getUTCDate();
        from_dt.setTime(from = ts);
    }
    from_dt.setUTCMonth(from_dt.getUTCMonth() + 1, 0);
    mult += (to - from) / ms.DAY / from_dt.getUTCDate();
    return mult;
};

E.t.mo_len = function (d) {
    d = new Date(+date(d));
    d.setUTCMonth(d.getUTCMonth() + 1, 0);
    return d.getUTCDate();
};

E.t.is_full_month_period = function (period) {
    var pfrom = +date(period.from),pto = +date(period.to);
    return pfrom == +date.align(pfrom, 'MONTH') &&
    pto == Math.min(+date.align(date(), 'DAY') + ms.DAY,
    +date.add(date.align(pfrom, 'MONTH'), { month: 1 }));
};

E.t.round_dt = function (val, fn) {
    if (typeof val != 'number')
    val = +date(val);
    return fn(val / ms.DAY) * ms.DAY;
};

E.t.defaults = function (opt, defaults) {
    var res = {};
    for (var k in defaults)
    {
        if (defaults[k] != null)
        res[k] = defaults[k];
    }
    for (var _k in opt)
    {
        if (opt[_k] != null)
        res[_k] = opt[_k];
    }
    return res;
};

var round0 = function round0(v) {return Math.round(v);};
var round2 = function round2(v) {return Math.round(v * 100) / 100;};
var round4 = function round4(v) {return Math.round(v * 10000) / 10000;};
var round6 = function round6(v) {return Math.round(v * 1000000) / 1000000;};
var dstr = function dstr(d) {return date.strftime('%F', date(d));};
var cash_str = function cash_str(v) {return '$' + v.toFixed(2).replace(/\.00$/, '');};

var sot = +date('1000-01-01T00:00:00Z'),eot = +date('3000-01-01T00:00:00Z');
_this.calc_cost_featured = E;
})(this);

//运行函数
const assign = Object.assign
let today = now => +this.date.align(now, 'DAY');
let tomorrow = now => +this.date.add(today(now), {day: 1});
let round6 = v => Math.round(v*1000000)/1000000;
let _typeof = obj =>  typeof obj;

// 获取接口下的流量
const calculate_zone_usage = (s, date_range, bw, customers_libs) =>{
    /*
     s 是 接口get_customer的数据
     bw  是接口 bw 的数据
     date_range  包含两个数据 一个是 from  时间格式为%d-%b-%y to 时间格式为时间戳
     */
    bw = bw[s.customer_name]
    s = {cust: s, run_rate: false}
    let zone_usage = calc({
        from: date_range.from,
        to: date_range.to,
        data: bw,
        customer: s.cust,
        precommit: s.precommit,
        runrate: s.run_rate,
        explain: 1,
    }, customers_libs)
    return zone_usage
}

const libs_get = (s, customers_libs) => {
    const libs = this.conv.JSON_parse(customers_libs)
    s = s || Object.keys(libs)[0];
    if (libs[s]==null)
        throw new Error('lib not found: '+s);
    return libs[s];
}

const calc = (opt, customers_libs) => {
    var lib = libs_get('lum', customers_libs)
    opt = assign({lib}, opt);
    if (opt.runrate && opt.data)
        opt.data = this.calc_cost_featured.run_rate(opt.data, opt.from, opt.to)
    return this.calc_cost_featured(opt)
}

//获取余额
const billing = (s, bw, billing, date_range, customers_libs) => {
    /*
     s 是 接口get_customer的数据
     bw  是接口 bw 的数据
     date_range  包含两个数据 一个是 from  时间格式为时间戳 to 时间格式为时间戳
     billing  接口 customer_info 的数据
     */
    bw = bw[s.customer_name]
    let cost_opt = {
        from: date_range.from,
        to: this.date(Math.min(date_range.to, tomorrow())),
        data: bw,
        vat: 1,
        customer: s,
        explain: 1,
    };
    let cost = calc(cost_opt, customers_libs);
    cost = assign(cost_opt, {sum: +cost.sum[1]||0, explain: cost.explain});
    let price = get_price(s);
    let prepayment = calc_prepayment('lum', s, {grace: 1}, undefined, customers_libs);
    let threshold = get_billing_threshold(s, billing, cost.sum, {price, prepayment});
    return threshold;
}

const get_price = (customer, d, opt) => {
    d = this.date(d);
    opt = opt||{};
    customer = customer||{};
    var end, pricing = customer.pricing||[];
    if (!(end = customer.end||customer.evaluation) && customer.status=='eval')
        end = (pricing[0]||{}).start || customer.start;
    if (end)
        end = this.date(end);
    if (end && end<=d && !opt.ignore_all)
        return;
    return this.util.get_plan(pricing, d, opt);
};

const get_billing_threshold = (cust, bacc, cost, opt) => {
    cust = cust||{}; // XXX philippe: why can cust be null?
    opt = opt||{};
    let price = opt.price || get_any_price(cust);
    let past_due_debt = opt.past_due_debt!=null ? opt.past_due_debt
        : bacc.past_due_debt;
    return get_threshold('lum', {
        prepaid: !price || price.prepaid,
        daily_precommit: price&&price.daily_precommit,
        balance: bacc.balance, credit_line: cust.credit_line,
        cost, past_due_debt, prepayment: opt.prepayment,
        pc_warn: price&&price.pc_warn!=null ? price.pc_warn : cust.pc_warn,
        pc_crit: price&&price.pc_crit!=null ? price.pc_crit : cust.pc_crit,
    });
};

const get_any_price = (customer, d) => {
    customer = customer||{};
    return this.util.get_plan(customer.pricing, d, {ignore_all: 1});
};

const get_threshold = (site, opt, monitor) => {
    var max = Math.max, floor = Math.floor, ceil = Math.ceil;
    // sanitize arguments
    opt = assign({}, opt);
    ['prepaid', 'balance', 'credit_line', 'cost', 'past_due_debt',
        'prepayment'].forEach(function(k){ opt[k] = +opt[k]||0; });
    if (opt.prepaid)
        opt.credit_line = 0;
    else
        opt.prepayment = 0;
    monitor = monitor||{cost: 1, debt: 1};
    // basic result fields
    var res = {prepaid: opt.prepaid};
    ['balance', 'credit_line'].forEach(function(k){ res[k] = opt[k]; });
    res.capacity = round6(opt.balance+opt.credit_line);
    res.cost = opt.cost;
    res.prepayment = opt.prepayment;
    res.owed = res.cost;
    if (opt.prepaid && opt.daily_precommit && res.prepayment>res.cost)
        res.owed = res.prepayment;
    res.calc_balance = round6(res.capacity-res.owed);
    res.percent = res.capacity>0 ? floor(100*res.owed/res.capacity) : 100;
    res.past_due_debt = opt.past_due_debt;
    ['debt_warn', 'debt_precommit', 'debt_crit', 'debt_enable']
        .forEach(function(k){ res[k] = 0; });
    // debt_* fields
    var cost = opt.cost, bal = res.calc_balance;
    if (monitor.cost)
    {
        var warn_bal = round6(cost*(100/opt.pc_warn-1));
        if (site=='lum' && opt.balance>=200)
            warn_bal = max(99.99, warn_bal);
        if (bal<=warn_bal)
            res.debt_warn = max(res.debt_warn, ceil(warn_bal-bal+0.001));
        if (opt.prepayment>0 && opt.balance<opt.prepayment)
            res.debt_precommit = round6(opt.prepayment-opt.balance);
        var crit_bal = round6(cost*(100/opt.pc_crit-1));
        if (bal<=crit_bal)
            res.debt_crit = max(res.debt_crit, ceil(crit_bal-bal+0.001));
    }
    if (!opt.prepaid && monitor.debt && opt.past_due_debt)
        res.debt_crit = max(res.debt_crit, opt.past_due_debt);
    res.debt_warn = max(res.debt_warn, res.debt_precommit, res.debt_crit);
    res.debt_enable = max(res.debt_precommit, res.debt_crit);
    // special case: spark watermark
    if (opt.spark_watermark)
        res.debt_warn = res.debt_crit = res.debt_enable = 0;
    return res;
};

const calc_prepayment = (site, cust, d, opt, customers_libs) => {
    if (opt === undefined && (typeof d === 'undefined' ? 'undefined' : _typeof(d)) == 'object' && !(d instanceof Date))
    {
        opt = d;
        d = undefined;
    }
    console.log(d)
    console.log(this.date(d))
    d = +this.date(d);
    var gpr = get_glob_pricing(site, cust, d, customers_libs);
    if (!gpr.prepaid)
        return 0;
    if (opt && opt.grace && site == 'lum' && this.date(d).getUTCDate() < 5)
        return 0;
    if (!(opt && opt.fake_active) && !gpr.active)
        return 0;
    return gpr.precommit;
};

const get_glob_pricing = (site, cust, d, customers_libs) => {
    var lib = libs_get(site, customers_libs);
    if (site == 'lum')
        return this.calc_cost_featured.calc_glob_plan(lib, cust, d);
    throw new Error('Not implemented for site ' + site);
};