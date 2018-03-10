(function ()
{
	function nodeNewRaw ( tag, type, name )
	{
		var node = {
			end: false,
			type: type,
			name: name,
			html: document.createElement(tag),
			
			parent: null, child: null,
			next: null, prev: null,
			
			style: {}, attr: {}, logic: {}, 
		};
		
		nodeAttr(node, 'id=NUI-' + type);
		nodeAttr(node, 'tabindex=-1');
		
		return node.html.wrap = node;
	};
	
	function nodeNewStd (tag, type, name, end)
	{
		var node = nodeNewRaw(tag, type, name); node.end = end;
		
		nodeUtil(node, '_x', function (x) 
		{
			//if (x >= 0) {nodeStyle(this, ['left:', x*cell.w, 'px'].join(''));}
			//if (x < 0) {nodeStyle(this, ['right:', -x*cell.w, 'px'].join(''));}
			nodeStyle(this, ['left:', x*cell.w, 'px'].join(''));
		});
		nodeUtil(node, '_y', function (y) 
		{
			//if (y >= 0) {nodeStyle(this, ['top:', y*cell.h, 'px'].join(''));}
			//if (y < 0) {nodeStyle(this, ['bottom:', -y*cell.h, 'px'].join(''));}
			nodeStyle(this, ['top:', y*cell.h, 'px'].join(''));
		});
		nodeUtil(node, '_w', function (w) 
		{
			if (w >= 0) {nodeStyle(this, ['width:', w*cell.w, 'px'].join(''));}
		});
		nodeUtil(node, '_h', function (h) 
		{
			if (h >= 0) {nodeStyle(this, ['height:', h*cell.h, 'px'].join(''));}
		});
		
		return node;
	};
	
	function nodeAttr ( node, str )
	{
		var list = str.split(';');
		var map = node.attr;
		
		for ( var i = 0, ni = list.length; i < ni && list[i]; ++i )
		{
			var pair = list[i].match(/\s*([^: ]+)\s*=\s*([^]+)/);
			
			map[pair[1]] = pair[2];
		}
		
		for ( var i in map )
		{
			node.html.setAttribute(i, map[i]);
		}
		
		return node;
	};
	
	function nodeStyle ( node, str )
	{
		var list = str.split(';');
		var map = node.style;
		var buf = [];
		
		for ( var i = 0, ni = list.length; i < ni && list[i]; ++i )
		{
			var pair = list[i].match(/\s*([^: ]+)\s*:\s*([^]+)/);
			
			map[pair[1]] = pair[2];
		}
		
		for ( var i in map ) 
		{
			buf.push(i, ': ', map[i], '; ');
		}
		
		node.html.setAttribute('style', buf.join(''));
		return node;
	};
	
	function nodeListener (node, name, f)
	{
		if (name[0] != '.') {throw 'Node handler should start from "."';}
		
		if ( !f && node.logic[name] )
		{
			if ( name != '.data' ) {node.html.removeEventListener(name.substring(1), node.logic[name]);}
			delete node.logic[name];
		}
		else
		{
			node.logic[name] = f;
			if ( name != '.data' ) {node.html.addEventListener(name.substring(1), f);}
		}
		
		return node;
	};
	
	function nodeUtil (node, name, f)
	{
		if (name[0] != '_') {throw 'Node util should start from "_"';}
		
		node.logic[name] = f;
		node.html.addEventListener(name.substring(1), f);
		
		return node;
	};
	
	function nodeAction (node, strFrom, strTo)
	{
		var pFrom = strFrom.match(/\s*(.*)\s*:\s*(.*)\s*:\s*(.*)\s*/i);
		var pTo = strTo.match(/\s*(.*)\s*:\s*(.*)\s*[\(]\s*(.*)\s*[\)]\s*/i);
		var list = pTo[3] ? pTo[3].split(',') : [];
		var action = {
			fromType: pFrom[1],
			fromName: pFrom[2],
			fromID: pFrom[3],
			
			toDir: pTo[1],
			toID: pTo[2],
			toData: {}
		};
		
		for ( var i = 0, ni = list.length; i < ni; ++i )
		{
			var arg = list[i].match(/\s*(.+)\s*:\s*(.+)\s*/i);
			action.toData[arg[1]] = arg[2];
		}
		
		var index = 0;
		while ( node.logic[index++] ) {}
		
		node.logic[index] = action;
		return node;
	};
	
	function nodeData (node, name, value)
	{
		var uName = '_' + name;
		var prev = node.logic[name];
		
		if ( node.logic[uName] )
		{
			node.logic[uName].call(node, value);
		}
		
		node.logic[name] = value;
		
		if ( node.logic['.data'] )
		{
			node.logic['.data']({name: name, prev: prev, cur: value});
		}
		return node;
	};
	
	function nodeAppend ( parent, child )
	{
		if ( parent.end && child.type.indexOf('Int-') != 0 ) 
		{
			throw `Node [${parent.type}:${parent.name}] is terminate`;
		}
		
		child.next = parent.child;
		child.prev = null;
		child.parent = parent;
		parent.child = child;
		
		parent.html.appendChild(child.html);
		
		return child;
	};
	
	function nodeRemove ( child )
	{
		var parent = child.parent;
		
		if ( parent.child == child )
		{
			parent.child = child.next;
		}
		
		if ( child.prev )
		{
			child.prev.next = child.next;
		}
		
		if ( child.next )
		{
			child.next.prev = child.prev;
		}
		
		child.parent = null;
		child.prev = null;
		child.next = null;
		
		parent.html.removeChild(child.html);
		return child;
	};
	
	function nodeFind ( node, type, name )
	{
		if ( node.type == type && node.name == name )
		{
			return node;
		}
		
		for ( var i = node.child; i; i = i.next )
		{
			var ret = nodeFind(i, type, name);
			
			if ( ret )
			{
				return ret;
			}
		}
		
		return null;
	};
	
	function nodeMsg (node, dir, type, name, id, data)
	{
		if ( !node ) {return;}
		
		var list = [];
		
		for (var i = 1; node.logic[i]; ++i)
		{
			var item = node.logic[i];
			
			//пропуск неподходящих 
			if ( item.fromID != id && item.fromID != '*' ) {continue;}
			if ( item.fromName != name && item.fromName != '*' ) {continue;}
			if ( item.fromType != type && item.fromType != '*' ) {continue;}
			
			list.push(item);
		}
		
		if ( list.length )
		{
			for (var i = 0, ni = list.length; i < ni; ++i)
			{
				nodeMsg(node, list[i].toDir, node.type, node.name, list[i].toID, list[i].toData);
			}
			
			//копирование полей
			for ( var i in data )
			{
				nodeData(last, i, data[i]);
			}
			
			return true;
		}
		
		switch (dir)
		{
			case 'up':
				nodeMsg(node.parent, dir, type, name, id, data);
				break;
				
			case 'down':
				for ( var i = node.child; i; i = i.next )
				{
					nodeMsg(i, dir, type, name, id, data);
				}
				break;
				
			case 'side':
				
				for ( var i = node.parent.child; i; i = i.next )
				{
					if ( i != node ) {nodeMsg(i, null, type, name, id, data);}
				}
				break;
		}
		
		return false;
	};
	
	var last = null;
	var cell = {w: 1, h: 1, s: 10};
	var root = nodeNewRaw('div', 'root', 'root');
	
	var pool = {
		Act: function (strFrom, strTo)
		{
			nodeAction(last, strFrom, strTo);
			
			return this;
		},
		Var: function (obj)
		{
			for (var i in obj)
			{
				nodeData(last, i, obj[i]);
			}
			
			return this;
		},
		
		Form: function (name)
		{
			var node = nodeNewStd('div', 'Form', name, false);
			var xAxis = nodeNewRaw('div', 'Int-1', 'xAxis');
			var xRoll = nodeNewRaw('div', 'Int-2', 'xRoll');
			var yAxis = nodeNewRaw('div', 'Int-3', 'yAxis');
			var yRoll = nodeNewRaw('div', 'Int-4', 'yRoll');
			
			node.logic.ws = 0;
			node.logic.hs = 0;
			xAxis.logic.size = 0;
			yAxis.logic.size = 0;
			xRoll.logic.size = 0; xRoll.logic.offset = 0; xRoll.logic.scale = 0;
			yRoll.logic.size = 0; yRoll.logic.offset = 0; yRoll.logic.scale = 0;
			
			nodeAppend(last, node);
			nodeAppend(xAxis, xRoll);
			nodeAppend(yAxis, yRoll);
			
			nodeAttr(node, 'class = NUI-Widget NUI-Standart');
			nodeAttr(xAxis, 'class = NUI-Widget NUI-Standart');
			nodeAttr(yAxis, 'class = NUI-Widget NUI-Standart');
			nodeAttr(xRoll, 'class = NUI-Widget NUI-Standart NUI-Hover NUI-Active');
			nodeAttr(yRoll, 'class = NUI-Widget NUI-Standart NUI-Hover NUI-Active');
			
			function calcAxisSize ()
			{
				if ( node.logic.ws && !node.logic.hs )
				{
					xAxis.logic.size = cell.w*node.logic.w;
					nodeStyle(xAxis, `width: ${xAxis.logic.size}px; height: ${cell.h}px;`);
				}
				else if ( !node.logic.ws && node.logic.hs )
				{
					yAxis.logic.size = cell.h*node.logic.h;
					nodeStyle(yAxis, `width: ${cell.w}px; height: ${yAxis.logic.size}px;`);
				}
				else if ( node.logic.ws && node.logic.hs )
				{
					xAxis.logic.size = cell.w*node.logic.w - cell.w - 1;
					yAxis.logic.size = cell.h*node.logic.h - cell.h - 1;
					nodeStyle(xAxis, `width: ${xAxis.logic.size}px; height: ${cell.h}px;`);
					nodeStyle(yAxis, `width: ${cell.w}px; height: ${yAxis.logic.size}px;`);
				}
			}
			
			function calcContentOffset ()
			{
				if ( node.logic.ws )
				{
					for ( var i = node.child; i; i = i.next )
					{
						if ( i.name != 'xAxis' && i.name != 'yAxis' ) 
						{
							nodeStyle(i, `left: ${i.logic.x*cell.w - xRoll.logic.offset}px`);
						}
					}
				}
				
				if ( node.logic.hs )
				{
					for ( var i = node.child; i; i = i.next )
					{
						if ( i.name != 'xAxis' && i.name != 'yAxis' ) 
						{
							nodeStyle(i, `top: ${i.logic.y*cell.h - yRoll.logic.offset}px`);
						}
					}
				}
			}
			
			function calcRollOffset ()
			{
				if ( node.logic.ws )
				{
					var sum = xRoll.logic.offset + xRoll.logic.size;
					
					if ( sum - xAxis.logic.size > 0 ) {xRoll.logic.offset -= sum - xAxis.logic.size;}
					if ( xRoll.logic.offset < 0 ) {xRoll.logic.offset = 0;}
					
					nodeStyle(xRoll, `left: ${xRoll.logic.offset}px`);
				}
				
				if ( node.logic.hs )
				{
					var sum = yRoll.logic.offset + yRoll.logic.size;
					
					if ( sum - yAxis.logic.size > 0 ) {yRoll.logic.offset -= sum - yAxis.logic.size;}
					if ( yRoll.logic.offset < 0 ) {yRoll.logic.offset = 0;}
					
					nodeStyle(yRoll, `top: ${yRoll.logic.offset}px`);
				}
			}
			
			function calcRollSize ()
			{
				if ( node.logic.ws )
				{
					var a = xAxis.logic.size/(node.logic.ws*cell.w)*100;
					var b = xAxis.logic.size*a/100;
					
					xRoll.logic.size = b < xAxis.logic.size ? b : xAxis.logic.size;
					nodeStyle(xRoll, `width: ${xRoll.logic.size}px; height: ${cell.h}px`);
				}
				
				if ( node.logic.hs )
				{
					var a = yAxis.logic.size/(node.logic.hs*cell.h)*100;
					var b = yAxis.logic.size*a/100;
					
					yRoll.logic.size = b < yAxis.logic.size ? b : yAxis.logic.size;
					nodeStyle(yRoll, `width: ${cell.w}px; height: ${yRoll.logic.size}px`);
				}
			}
			
			nodeListener(yRoll, '.mousedown', function (e) 
			{
				nodeListener(root, '.mousemove', function (e) 
				{
					yRoll.logic.offset += e.movementY;
					
					calcRollOffset ();
					calcContentOffset ();
					
					e.target.ownerDocument.defaultView.getSelection().removeAllRanges();
				});
				
				nodeListener(root, '.mouseup', function (e) 
				{
					nodeListener(root, '.mousemove', null);
					nodeListener(root, '.mouseup', null);
					nodeListener(root, '.mouseleave', null);
				});
				
				nodeListener(root, '.mouseleave', function (e) 
				{
					nodeListener(root, '.mousemove', null);
					nodeListener(root, '.mouseup', null);
					nodeListener(root, '.mouseleave', null);
				});
			});
			
			nodeListener(xRoll, '.mousedown', function (e) 
			{
				nodeListener(root, '.mousemove', function (e) 
				{
					xRoll.logic.offset += e.movementX;
					
					calcRollOffset ();
					calcContentOffset ();
					
					e.target.ownerDocument.defaultView.getSelection().removeAllRanges();
				});
				
				nodeListener(root, '.mouseup', function (e) 
				{
					nodeListener(root, '.mousemove', null);
					nodeListener(root, '.mouseup', null);
					nodeListener(root, '.mouseleave', null);
				});
				
				nodeListener(root, '.mouseleave', function (e) 
				{
					nodeListener(root, '.mousemove', null);
					nodeListener(root, '.mouseup', null);
					nodeListener(root, '.mouseleave', null);
				});
			});
			
			nodeListener(node, '.wheel', function (e) 
			{
				var mode = e.deltaMode;
				var delta = e.deltaY;
				
				if (mode == 1) {delta *= 15;}
				if (mode == 2) {delta *= node.logic.h*cell.h;}
				
				yRoll.logic.offset += delta/2;
				calcRollOffset ();
				calcContentOffset ();
			});
			
			nodeUtil(node, '_ws', function (ws) 
			{
				if ( !ws ) 
				{
					xRoll.logic.offset = 0;
					//nodeRemove...
					return;
				}
				
				node.logic.ws = ws; 
				calcAxisSize();
				calcRollSize ();
				nodeAppend(node, xAxis);
			});
			
			nodeUtil(node, '_hs', function (hs) 
			{
				if ( !hs ) 
				{
					yRoll.logic.offset = 0;
					//nodeRemove...
					return;
				}
				
				node.logic.hs = hs; 
				calcAxisSize();
				calcRollSize ();
				nodeAppend(node, yAxis);
			});
			
			nodeUtil(node, '_w', function (w) 
			{
				if (w >= 0) {node.logic.w = w; nodeStyle(node, ['width:', w*cell.w, 'px'].join(''));}
				if (node.logic.ws) {calcAxisSize(); calcRollSize (); calcRollOffset(); calcContentOffset ();}
			});
			
			nodeUtil(node, '_h', function (h) 
			{
				if (h >= 0) {node.logic.h = h; nodeStyle(node, ['height:', h*cell.h, 'px'].join(''));}
				if (node.logic.hs) {calcAxisSize(); calcRollSize ();  calcRollOffset(); calcContentOffset ();}
			});
			
			return last = node, this;
		},
		
		Button: function (name)
		{
			var node = nodeNewStd('div', 'Button', name, true);
			var text = nodeNewRaw('div', 'Int-1', 'text');
			
			nodeAttr(node, 'class = NUI-Noselect NUI-Widget NUI-Standart NUI-Hover NUI-Active');
			nodeAppend(last, node);
			nodeAppend(node, text);
			
			//STATE
			nodeUtil(node, '_h', function (h) 
			{
				if ( h < 0 ) {return;}
				
				//nodeStyle(node, `height: ${h*cell.h*100/100 + cell.h}px`);
				nodeStyle(node, `padding-top: ${cell.h*45/100}px`);
				nodeStyle(node, `padding-bottom: ${cell.h*55/100}px`);
				
				nodeStyle(text, `height: ${h*cell.h*100/100}px`);
				nodeStyle(text, `font-size: ${h*cell.h*100/100}px`);
			});
			nodeUtil(node, '_v', function (v) 
			{
				text.html.textContent = v;
			});
			
			//EVENTS
			nodeListener(node, '.click', function (v) 
			{
				nodeMsg(node, null, '', '', 'click', {});
				return false;
			});
			
			
			return last = node, this;
		},
		
		Radio: function (name)
		{
			var node = nodeNewStd('div', 'Radio', name, true);
			var flag = nodeNewRaw('div', 'Int-1', 'flag');
			var text = nodeNewRaw('div', 'Int-2', 'text');
			var iconSelect = "&#9673";
			var iconUnselect = "&#9676";
			
			nodeAttr(node, 'class = NUI-Noselect NUI-Widget NUI-Standart NUI-Hover NUI-Active');
			nodeAppend(last, node);
			nodeAppend(node, flag);
			nodeAppend(node, text);
			
			
			nodeListener(node, '.click', function (e) 
			{
				nodeData(this.wrap, 's', true);
				nodeMsg(node, null, '', '', 'click', {});
			});
			
			nodeUtil(node, '_h', function (h) 
			{
				if ( h < 0 ) {return;}
				
				//nodeStyle(node, `height: ${h*cell.h*100/100 + cell.h*0.5}px`);
				nodeStyle(node, `padding-top: ${cell.h*40/100}px`);
				nodeStyle(node, `padding-bottom: ${cell.h*60/100}px`);
				nodeStyle(flag, `margin:  0px ${cell.h*50/100}px`);
				
				nodeStyle(text, `font-size: ${h*cell.h*100/100}px`);
				nodeStyle(flag, `font-size: ${h*cell.h*100/100}px`);
			});
			nodeUtil(node, '_v', function (v) 
			{
				text.html.textContent = v;
			});
			nodeUtil(node, '_s', function (s) 
			{
				if (!node.logic.s && s) 
				{
					for ( var i = node.parent.child; i; i = i.next )
					{
						if ( i.type != node.type || !i.logic.s) {continue;}
						
						nodeFind(i, 'Int-1', 'flag').html.innerHTML = iconUnselect;
						nodeAttr(i, 'class = NUI-Noselect NUI-Widget NUI-Standart NUI-Hover NUI-Active');
						i.logic.s = false;
					}
					
					flag.html.innerHTML = iconSelect;
					nodeAttr(node, 'class = NUI-Noselect NUI-Widget NUI-Select');
				}
			});
			
			flag.html.innerHTML = iconUnselect;
			
			return last = node, this;
		},
		
		Check: function (name)
		{
			var node = nodeNewStd('div', 'Check', name, true);
			var flag = nodeNewRaw('div', 'Int-1', 'flag');
			var text = nodeNewRaw('div', 'Int-2', 'text');
			var iconSelect = "&#10004";
			var iconUnselect = "&#11036";
			
			nodeAttr(node, 'class = NUI-Noselect NUI-Widget NUI-Standart NUI-Hover NUI-Active');
			nodeAppend(last, node);
			nodeAppend(node, flag);
			nodeAppend(node, text);
			
			
			nodeListener(node, '.click', function (e) 
			{
				nodeData(this.wrap, 's', !this.wrap.logic.s);
				nodeMsg(node, null, '', '', 'click', {});
			});
			
			nodeUtil(node, '_h', function (h) 
			{
				if ( h < 0 ) {return;}
				
				//nodeStyle(node, `height: ${h*cell.h*100/100 + cell.h*0.5}px`);
				nodeStyle(node, `padding-top: ${cell.h*(40/100)}px`);
				nodeStyle(node, `padding-bottom: ${cell.h*(60/100)}px`);
				nodeStyle(flag, `margin:  0px ${cell.h*(50/100)}px`);
				
				nodeStyle(text, `font-size: ${h*cell.h*(100/100)}px`);
				nodeStyle(flag, `font-size: ${h*cell.h*(100/100)}px`);
			});
			nodeUtil(node, '_v', function (v) 
			{
				text.html.textContent = v;
			});
			nodeUtil(node, '_s', function (s) 
			{
				if (!this.logic.s && s)
				{
					flag.html.innerHTML = iconSelect;
					nodeAttr(node, 'class = NUI-Noselect NUI-Widget NUI-Select');
				}
				
				if (this.logic.s && !s)
				{
					flag.html.innerHTML = iconUnselect;
					nodeAttr(node, 'class = NUI-Noselect NUI-Widget NUI-Standart NUI-Hover NUI-Active');
				}
			});
			
			node.logic.s = false;
			flag.html.innerHTML = iconUnselect;
			
			return last = node, this;
		},
		
		Line: function (name)
		{
			var node = nodeNewStd('div', 'Line', name, true);
			var name = nodeNewRaw('div', 'Int-1', 'name');
			var input = nodeAttr(nodeNewRaw('input', 'Int-2', 'input'), 'type=text');
			
			nodeAttr(node, 'class = NUI-Widget NUI-Standart');
			nodeAttr(name, 'class = NUI-Noselect');
			nodeAppend(last, node);
			nodeAppend(node, name);
			nodeAppend(node, input);
			
			nodeUtil(node, '_h', function (h) 
			{
				if ( h < 0 ) {return;}
				if ( !node.logic.c ) {nodeStyle(name, 'display: none');}
				
				
				nodeStyle(node, `padding-top: ${cell.h*(50/100)}px`);
				nodeStyle(node, `padding-bottom: ${cell.h*(50/100)}px`);
				//nodeStyle(input, `margin-top: 1px`);
				
				nodeStyle(name, `font-size: ${h*cell.h*(75/100)}px`);
				nodeStyle(input, `font-size: ${h*cell.h*(70/100)}px`);
				nodeStyle(name, `height: ${h*cell.h*(100/100)}px`);
				nodeStyle(input, `height: ${h*cell.h*(100/100)}px`);
				
				nodeStyle(input, `margin-left: ${cell.h*(50/100)}px`);
				nodeStyle(name, `margin-left: ${cell.h*(50/100)}px`);
				
				if (node.logic.w)
				{
					var w = node.logic.w*cell.w;
					nodeStyle(input, `width: ${w - cell.h*(100/100)*1}px`);
				}
			});
			nodeUtil(node, '_c', function (c) 
			{
				name.html.innerText = c;
				nodeStyle(name, 'display: block');
			});
			nodeUtil(node, '_v', function (v) 
			{
				input.html.value = v;
			});
			
			return last = node, this;
		},
		
		Area: function (name)
		{
			var node = nodeNewStd('div', 'Area', name, true);
			var name = nodeNewRaw('div', 'Int-1', 'name');
			var input = nodeNewRaw('textarea', 'Int-2', 'input');
			
			nodeAttr(node, 'class = NUI-Widget NUI-Standart');
			nodeAttr(name, 'class = NUI-Noselect');
			nodeAppend(last, node);
			nodeAppend(node, name);
			nodeAppend(node, input);
			
			nodeUtil(node, '_h', function (h) 
			{
				if ( h < 0 ) {return;}
				
				nodeStyle(node, `padding-top: ${cell.h*(50/100)}px`);
				nodeStyle(node, `padding-bottom: ${cell.h*(50/100)}px`);
				//nodeStyle(input, `margin-top: 1px`);
				
				nodeStyle(name, `font-size: ${h*cell.h*(75/100)}px`);
				nodeStyle(input, `font-size: ${h*cell.h*(70/100)}px`);
				nodeStyle(name, `height: ${h*cell.h*(100/100)}px`);
				nodeStyle(input, `height: ${h*cell.h*(100/100)}px`);
				
				nodeStyle(input, `margin-left: ${cell.h*(50/100)}px`);
				nodeStyle(name, `margin-left: ${cell.h*(50/100)}px`);
				
				if (node.logic.w)
				{
					var w = node.logic.w*cell.w;
					nodeStyle(input, `width: ${w - cell.h*(100/100)*1}px`);
				}
			});
			nodeUtil(node, '_c', function (c) 
			{
				name.html.innerText = c;
				nodeStyle(name, 'display: block');
			});
			nodeUtil(node, '_v', function (v) 
			{
				input.html.value = v;
			});
			nodeUtil(node, '_l', function (l) 
			{
				if ( l <= 0 ) {return;}
				var h = node.logic.h;
				nodeStyle(input, `height: ${cell.h*l}px`);
			});
			
			return last = node, this;
		},
		
		
		Size: function (name)
		{
			var node = nodeNewStd('div', 'Size', name, true);
			var a = null, b = null, offset = 0;
			
			nodeAttr(node, 'class = NUI-Noselect NUI-Widget NUI-Accent NUI-Hover NUI-Active');
			nodeAppend(last, node);
			
			function calcListX ()
			{
				var x = node.logic.x*cell.w, y = node.logic.y*cell.h;
				var w = node.logic.w*cell.w, h = node.logic.h*cell.h;
				
				for ( var i = node.parent.child; i; i = i.next)
				{
					if ( i == node ) {continue;}
					
					var xi = i.logic.x*cell.w, yi = i.logic.y*cell.h;
					var wi = i.logic.w*cell.w, hi = i.logic.h*cell.h;
					
					if (xi + wi == x && yi >= y && yi < y + h) {a.push(i);}
					if (x + w == xi && yi >= y && yi < y + h) {b.push(i);}
				}
			}
			
			function calcListY ()
			{
				var x = node.logic.x*cell.w, y = node.logic.y*cell.h;
				var w = node.logic.w*cell.w, h = node.logic.h*cell.h;
				
				for ( var i = node.parent.child; i; i = i.next)
				{
					if ( i == node ) {continue;}
					
					var xi = i.logic.x*cell.w, yi = i.logic.y*cell.h;
					var wi = i.logic.w*cell.w, hi = i.logic.h*cell.h;
					
					if (yi + hi == y && xi >= x && xi < x + w) {a.push(i);}
					if (y + h == yi && xi >= x && xi < x + w) {b.push(i);}
				}
			}
			
			function moveX (e)
			{
				var length = ~~((offset + e.movementX)/cell.w);
				
				if ( length != 0 )
				{
					nodeData(node, 'x', node.logic.x + length);
					
					for ( var i = 0, ni = a.length; i < ni; ++i )
					{
						nodeData(a[i], 'w', a[i].logic.w + length);
						sizeLeft(a[i], length);
					}
					
					for ( var i = 0, ni = b.length; i < ni; ++i )
					{
						nodeData(b[i], 'x', b[i].logic.x + length);
						nodeData(b[i], 'w', b[i].logic.w - length);
						
						sizeRight(b[i], length);
					}
				}
				
				offset = offset + e.movementX - length*cell.w;
			}
			
			function moveY (e)
			{
				var length = ~~((offset + e.movementY)/cell.h);
				
				if ( length != 0 )
				{
					nodeData(node, 'y', node.logic.y + length);
					
					for ( var i = 0, ni = a.length; i < ni; ++i )
					{
						nodeData(a[i], 'h', a[i].logic.h + length);
					}
					
					for ( var i = 0, ni = b.length; i < ni; ++i )
					{
						nodeData(b[i], 'y', b[i].logic.y + length);
						nodeData(b[i], 'h', b[i].logic.h - length);
					}
				}
				
				offset = offset + e.movementY - length*cell.h;
			}
			
			function calcLimX ()
			{
				var res = [false, false];
				
				for ( var i = 0, ni = a.length; i < ni; ++i )
				{
					if ( a[i].logic.w <= 10 ) {res[0] = true; break;}
				}
				
				for ( var i = 0, ni = b.length; i < ni; ++i )
				{
					if ( b[i].logic.w <= 10 ) {res[1] = true; break;}
				}
				
				return res;
			}
			
			function calcLimY ()
			{
				var res = [false, false];
				
				for ( var i = 0, ni = a.length; i < ni; ++i )
				{
					if ( a[i].logic.h <= 10 ) {res[0] = true; break;}
				}
				
				for ( var i = 0, ni = b.length; i < ni; ++i )
				{
					if ( b[i].logic.h <= 10 ) {res[1] = true; break;}
				}
				
				return res;
			}
			
			function sizeLeft (n, l)
			{
				for ( var i = n.child; i; i = i.next )
				{
					if ( i.type.indexOf('Int') == 0 ) {continue;}
					
					nodeData(i, 'w', i.logic.w + l);
					
					if ( !i.end )
					{
						sizeLeft (i, l);
					}
				}
			}
			
			function sizeRight (n, l)
			{
				for ( var i = n.child; i; i = i.next )
				{
					if ( i.type.indexOf('Int') == 0 ) {continue;}
					
					nodeData(i, 'x', i.logic.x + l);
					
					if ( !i.end )
					{
						sizeRight (i, l);
					}
				}
			}
			
			nodeListener(node, '.mousedown', function (e) 
			{
				a = []; b = [];
				
				if ( node.logic.a == 'x' ) {calcListX();}
				if ( node.logic.a == 'y' ) {calcListY();}
				if ( a.length == 0 && b.length == 0 ) {return;}
				
				nodeListener(root, '.mousemove', function (e) 
				{
					if ( node.logic.a == 'x' ) 
					{
						var lim = calcLimX ();
						
						if ( e.movementX < 0 && lim[0] ) {return;}
						if ( e.movementX > 0 && lim[1] ) {return;}
						
						moveX(e);
					}
					
					if ( node.logic.a == 'y' ) 
					{
						var lim = calcLimY ();
						
						if ( e.movementY < 0 && lim[0] ) {return;}
						if ( e.movementY > 0 && lim[1] ) {return;}
						
						moveY(e);
					}
					
					e.target.ownerDocument.defaultView.getSelection().removeAllRanges();
				});
				
				nodeListener(root, '.mouseup', function (e) 
				{
					nodeListener(root, '.mousemove', null);
					nodeListener(root, '.mouseup', null);
					nodeListener(root, '.mouseleave', null);
				});
				
				nodeListener(root, '.mouseleave', function (e) 
				{
					nodeListener(root, '.mousemove', null);
					nodeListener(root, '.mouseup', null);
					nodeListener(root, '.mouseleave', null);
				});
			});
			
			return last = node, this;
		},
		
		Text: function (name)
		{
			var node = nodeNewStd('div', 'Text', name, true);
			var text = nodeNewRaw('div', 'Int-1', 'text');
			
			nodeAttr(node, 'class = NUI-Widget NUI-Standart');
			nodeAppend(last, node);
			nodeAppend(node, text);
			
			nodeUtil(node, '_w', function (w) 
			{
				if ( w < 0 ) {return;}
				
				nodeStyle(node, `width: ${w*cell.w}px`);
				nodeStyle(text, `width: ${w*cell.w - 2*cell.w}px; left: ${cell.w}px;`);
			});
			
			nodeUtil(node, '_h', function (h) 
			{
				if ( h < 0 ) {return;}
				
				nodeStyle(text, `font-size: ${h*cell.h*(100/100)}px`);
			});
			
			nodeUtil(node, '_l', function (l) 
			{
				if ( l < 1 ) {return;}
				
				nodeStyle(node, `height: ${node.logic.h*cell.h*(l + 1)}px`);
				nodeStyle(text, `height: ${node.logic.h*cell.h*(l + 1) - 2*cell.h}px; top: ${cell.h}px;`);
			});
			
			nodeUtil(node, '_v', function (v) 
			{
				text.html.innerHTML = v.replace(/\n/g, '<br>');
			});
			
			return last = node, this;
		},
		
		
	};
	
	self.NUI = function (info)
	{
		last = root;
		
		if ( !info )
		{
			return pool;
		}
		
		if ( info.wnd || info.w || info.h )
		{
			if (info.w > 0) {cell.w = info.w;}
			if (info.h > 0) {cell.h = info.h;}
			if (info.s > 0) {cell.s = info.s;}
			if (info.wnd)
			{
				info.wnd.appendChild(root.html);
			}
			
			return pool;
		}
		
		var list = info.split('/');
		for ( var i = 0, ni = list.length; i < ni; ++i )
		{
			var pair = list[i].split(':')
			var exist = nodeFind(last, pair[0], pair[1]);
			
			if (exist)
			{
				last = exist;
			}
			else
			{
				pool[pair[0]](pair[1]);
			}
		}
		
		return pool;
	};
}());

