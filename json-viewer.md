react-json-view-lite is a tiny component for React allowing to render JSON as a tree. It focused on the balance between performance for large JSON inputs and functionality. It might not have all the rich features (suce as customization, copy, json editinng) but still provides more than just rendering json with highlighting - e.g. ability to collapse/expand nested objects and override css. It is written in TypeScript and has no dependencies.
Install
npm install --save react-json-view-lite
Version 2.x.x
Versions 2.x.x supports only React 18 and later. Please use 1.5.0 if your project uses React 16 or 17. Also version 2 provides better a11y support, collapsing/expanding and navigation through nested elements using arrow keys ("Space" button does not collapse/expand element anymore), but library size increased about 20%. If your project uses custom styles you will need to add the css for the childFieldsContainer property like below:

.child-fields-container {
  margin: 0;
  padding: 0;
}
because implementation uses ul element div instead of the elemenent according to the w3.org example.

Migration from the 0.9.x versions
Property shouldInitiallyExpand has different name shouldExpandNode in order to emphasize that it will be called every time properties change.
If you use custom styles:
pointer and expander are no longer used
component uses collapseIcon, expandIcon, collapsedContent styles in order to customize expand/collapse icon and collpased content placeholder which were previously hardcode to the ▸, ▾ and .... Default style values use ::after pseudo-classes to set the content.
Usage
import * as React from 'react';

import { JsonView, allExpanded, darkStyles, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

const json = {
  a: 1,
  b: 'example'
};

const App = () => {
  return (
    <React.Fragment>
      <JsonView data={json} shouldExpandNode={allExpanded} style={defaultStyles} />
      <JsonView data={json} shouldExpandNode={allExpanded} style={darkStyles} />
    </React.Fragment>
  );
};

export default App;
Please note that in JavaScript, an anonymous function like function() {} or () => {} always creates a different function every time component is rendered, so you might need to use useCallback React Hook for the shouldExpandNode parameter or extract the function outside the functional component.

StoryBook
https://anyroad.github.io/react-json-view-lite/

Props
Name	Type	Default Value	Description
data	Object | Array<any>		Data which should be rendered
style	StyleProps	defaultStyles	Optional. CSS classes for rendering. Library provides two build-in implementations: darkStyles, defaultStyles (see below)
shouldExpandNode	(level: number, value: any, field?: string) => boolean	allExpanded	Optional. Function which will be called during initial rendering for each Object and Array of the data in order to calculate should if this node be expanded. Note that this function will be called again to update the each node state once the property value changed. level startes from 0, field does not have a value for the array element. Library provides two build-in implementations: allExpanded and collapseAllNested (see below)
clickToExpandNode	boolean	false	Optional. Set to true if you want to expand/collapse nodes by clicking on the node itself.
beforeExpandChange	(event: NodeExpandingEvent) => boolean	undefined	Optional. Function which will be called before node expanded or collapsed. If the function returns true then expand/collapse process goes as usual, if it returns false then node state stay the same. For example, you can return false to change shouldExpandNode property in order to open only desired children nodes.
compactTopLevel	boolean	false	Optional. Set to true if you do not want to render top level collapse/expand button and indentation. Has no effect if the data parameter is not an Object.
interface NodeExpandingEvent
Field Name	Type	Description
level	number	level of expanded/collapsed node
value	any	Field value (object or array) to be expaneded/collapsed
field	string?	Field name
newExpandValue	boolean	if node is about to be expanded (true) or collapsed (false)
interface AriaLabels
Field Name	Type	Description
collapseJson	string	aria-label property for the "collapse" node button. Default value is "collapse JSON".
expandJson	string	aria-label property for the "expand" node button. Default value is "expand JSON".
Extra exported
Name	Type	Description
defaultStyles	StyleProps	Default styles for light background
darkStyles	StyleProps	Default styles for dark background
allExpanded	() => boolean	Always returns true
collapseAllNested	(level: number) => boolean	Returns true only for the first level (level=0)
StyleProps
Name	Type	Description
container	string	CSS class name for rendering parent block
childFieldsContainer	string	CSS class name for rendering parent block of array or object
basicChildStyle	string	CSS class name for property block containing property name and value
collapseIcon	string	CSS class name for rendering button collapsing Object and Array nodes. Default content is ▾.
expandIcon	string	CSS class name for rendering button expanding Object and Array nodes. Default content is ▸.
collapsedContent	string	CSS class name for rendering placeholder when Object and Array nodes are collapsed. Default contents is ....
label	string	CSS class name for rendering property names
clickableLabel	string	CSS class name for rendering clickable property names (requires the clickToExpandNode prop to be true)
nullValue	string	CSS class name for rendering null values
undefinedValue	string	CSS class name for rendering undefined values
numberValue	string	CSS class name for rendering numeric values
stringValue	string	CSS class name for rendering string values
booleanValue	string	CSS class name for rendering boolean values
otherValue	string	CSS class name for rendering all other values except Object, Arrray, null, undefined, numeric, boolean and string
punctuation	string	CSS class name for rendering ,, [, ], {, }
noQuotesForStringValues	boolean	whether or not to add double quotes when rendering string values, default value is false
quotesForFieldNames	boolean	whether or not to add double quotes when rendering field names, default value is false
ariaLables	AriaLables	Text to use for the aria-label properties
stringifyStringValues	boolean	whether or not to call JSON.stringify for string values in order to preserve escaped string characters like new line, tab or quotes
Comparison with other libraries
Size and dependencies
Here is the size benchmark (using bundlephobia.com) against similar React libraries (found by https://www.npmjs.com/search?q=react%20json&ranking=popularity):

Library	Bundle size	Bundle size (gzip)	Dependencies
react-json-view-lite			
react-json-pretty			
react-json-inspector			
react-json-tree			
react-json-view			
react-json-tree-viewer			
Performance
Performance was mesaured using the react-component-benchmark library. Every component was rendered 50 times using the 300Kb json file as data source, please refer to source code of the benchmark project. All numbers are in milliseconds. Tests were performed on Macbook Air M1 16Gb RAM usging Chrome v96.0.4664.110(official build, arm64). Every component was tested 2 times but there was no significant differences in the results.

Library	Min	Max	Average	Median	P90
react-json-view-lite	81	604	195	82	582
react-json-pretty	22	59	32	24	56
react-json-inspector	682	1 109	758	711	905
react-json-tree	565	1 217	658	620	741
react-json-view	1 403	1 722	1529	1 540	1 631
react-json-tree-viewer	266	663	320	278	455
As you can see react-json-pretty renders faster than other libraries but it does not have ability to collapse/expand nested objects so it might be good choice if you need just json syntax highlighting.

License
MIT © AnyRoad

Readme
Keywords
reactjsoncomponentviewjson-viewjson-treelite