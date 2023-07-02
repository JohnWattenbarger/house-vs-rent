import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { TextField, Pivot, PivotItem, Stack, PrimaryButton } from "@fluentui/react";
import './App.css';

// Define some constants
const INFLATION_RATE = 0.03;
const INVESTMENT_RATE = 0.07;
const DEFAULT_YEARS = 30;

// Define a type for the input data
type InputData = {
  startingCash: number;
  monthlyIncome: number;
  currentRent: number;
  expectedHouseCost: number;
  years: number;
};

// Define a type for the output data
type OutputData = {
  year: number;
  initialCash: number;
  houseValue: number;
  rentOrMortgage: number;
  moneySpent: number;
  moneyAvailable: number;
  netInvestment: number;
};

// Define a function to calculate the monthly mortgage payment given the house cost, down payment and interest rate
function calculateMortgage(
  houseCost: number,
  downPayment: number,
  interestRate: number,
  years: number
): number {
  const principal = houseCost - downPayment;
  const monthlyRate = interestRate / 12;
  const n = years * 12;
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, n);
  const denominator = Math.pow(1 + monthlyRate, n) - 1;
  return numerator / denominator;
}

// Define a function to calculate the output data for renting, buying with 5% down or buying with 20% down
function calculateOutput(
  inputData: InputData,
  option: "rent" | "buy5" | "buy20"
): OutputData[] {
  // Initialize an empty array to store the output data
  const outputData: OutputData[] = [];

  // Initialize some variables to keep track of the current values
  let initialCash = inputData.startingCash;
  let downPayment = 0;
  if (option === "buy5") {
    downPayment = inputData.expectedHouseCost * 0.05;
  }
  if (option === "buy20") {
    downPayment = inputData.expectedHouseCost * 0.2;
  }
  let houseValue = 0;
  let rentOrMortgage = option === "rent" ? inputData.currentRent : calculateMortgage(inputData.expectedHouseCost, downPayment, option === "buy5" ? 0.03 : 0.025, inputData.years);
  let moneySpent = rentOrMortgage * 12;
  let moneyAvailable = inputData.monthlyIncome;
  let netInvestment = moneyAvailable * 12 - moneySpent;

  // Loop through the years and calculate the output data for each year
  for (let year = 0; year < inputData.years; year++) {
    // Push the current values to the output data array
    outputData.push({
      year,
      initialCash,
      houseValue,
      rentOrMortgage,
      moneySpent,
      moneyAvailable,
      netInvestment,
    });

    // subtract the down payment
    if (year === 0) {
      if (option === "buy5") {
        initialCash = initialCash - (.05 * inputData.expectedHouseCost);
      }
      if (option === "buy20") {
        initialCash = initialCash - (.2 * inputData.expectedHouseCost);
      }
    }

    // Update the current values for the next year
    houseValue = calculateHouseValue(option, inputData, year);
    initialCash = initialCash * (1 + INVESTMENT_RATE) + netInvestment; // Add the investment returns and the net investment to the initial cash
    rentOrMortgage =
      option === "rent"
        ? rentOrMortgage * (1 + INFLATION_RATE) // Increase the rent by the inflation rate
        : rentOrMortgage; // Keep the mortgage constant
    moneySpent = rentOrMortgage * 12; // Multiply the rent or mortgage by 12 months
    // moneyAvailable = moneyAvailable; // Keep the money available constant
    netInvestment = moneyAvailable * 12 - moneySpent; // Subtract the money spent from the money available times 12 months
  }

  // Return the output data array
  return outputData;
}

// Calculate what the house will be worth after a certain number of years
function calculateHouseValue(type: string, inputData: InputData, years: number) {
  return type === "rent" ? 0 : inputData.expectedHouseCost * Math.pow(1 + INFLATION_RATE, years);
}

// Define a function to format a number as currency
function formatCurrency(num: number): string {
  return "$" + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Define a function to calculate the summary data for renting vs buying
function calculateSummary(
  inputData: InputData,
  option1: "rent" | "buy5" | "buy20",
  option2: "rent" | "buy5" | "buy20"
): string {
  // Get the output data for both options
  const outputData1 = calculateOutput(inputData, option1);
  const outputData2 = calculateOutput(inputData, option2);

  // Get the final values for both options
  const finalValue1 = outputData1[outputData1.length - 1].initialCash + (calculateHouseValue(option1, inputData, inputData.years));
  const finalValue2 = outputData2[outputData2.length - 1].initialCash + (calculateHouseValue(option2, inputData, inputData.years));

  // Compare the final values and return a summary string
  if (finalValue1 > finalValue2) {
    return `You will have more money if you ${option1 === "rent" ? "rent" : "buy a house with " + (option1 === "buy5" ? "5%" : "20%") + " down payment"} than if you ${option2 === "rent" ? "rent" : "buy a house with " + (option2 === "buy5" ? "5%" : "20%") + " down payment"}. The difference is ${formatCurrency(finalValue1 - finalValue2)}.`;
  } else if (finalValue1 < finalValue2) {
    return `You will have more money if you ${option2 === "rent" ? "rent" : "buy a house with " + (option2 === "buy5" ? "5%" : "20%") + " down payment"} than if you ${option1 === "rent" ? "rent" : "buy a house with " + (option1 === "buy5" ? "5%" : "20%") + " down payment"}. The difference is ${formatCurrency(finalValue2 - finalValue1)}.`;
  } else {
    return `You will have the same amount of money if you ${option1 === "rent" ? "rent" : "buy a house with " + (option1 === "buy5" ? "5%" : "20%") + " down payment"} or if you ${option2 === "rent" ? "rent" : "buy a house with " + (option2 === "buy5" ? "5%" : "20%") + " down payment"}. The amount is ${formatCurrency(finalValue1)}.`;
  }
}

// Define a component to render a table with the output data
function OutputTable(props: { data: OutputData[]; title: string }) {
  return (
    <div>
      <h3>
        {props.title}
      </h3>
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Initial Cash</th>
            <th>House Value</th>
            <th>Rent</th>
            <th>Yearly Rent</th>
            <th>Monthly Income</th>
            <th>Yearly Net Investment Money</th>
          </tr>
        </thead>
        <tbody>
          {props.data.map((row) => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td>{formatCurrency(row.initialCash)}</td>
              <td>{formatCurrency(row.houseValue)}</td>
              <td>{formatCurrency(row.rentOrMortgage)}</td>
              <td>{formatCurrency(row.moneySpent)}</td>
              <td>{formatCurrency(row.moneyAvailable)}</td>
              <td>{formatCurrency(row.netInvestment)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Define a component to render a chart with the output data
const OutputChart = (props: { data: OutputData[]; title: string }) => {
  return (
    <div>
      <h3>{props.title}</h3>
      <LineChart width={800} height={400} data={props.data}>
        <XAxis dataKey="year" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="initialCash" stroke="#8884d8" />
      </LineChart>
    </div>
  );
}

// Define a component to render a summary with the output data
const OutputSummary = (props: { data: InputData }) => {
  return (
    <div>
      <h3>Summary</h3>
      <p>{calculateSummary(props.data, 'rent', 'buy5')}</p>
      <p>{calculateSummary(props.data, 'rent', 'buy20')}</p>
      <p>{calculateSummary(props.data, 'buy5', 'buy20')}</p>
    </div>
  );
}

// Define a component to render the input fields and the calculate button
const InputForm = (props: { onSubmit: (data: InputData) => void }) => {
  // Define some state variables to store the input values
  const [startingCash, setStartingCash] = useState(138000);
  const [monthlyIncome, setMonthlyIncome] = useState(4000);
  const [currentRent, setCurrentRent] = useState(2000);
  const [expectedHouseCost, setExpectedHouseCost] = useState(700000);
  const [years, setYears] = useState(DEFAULT_YEARS);
  // };

  // Define a function to handle the submit event
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default behavior of reloading the page
    props.onSubmit({ startingCash, monthlyIncome, currentRent, expectedHouseCost, years }); // Call the onSubmit prop function with the input data
  }

  // Return the JSX element for the input form
  return (
    <form onSubmit={handleSubmit}>
      <Stack {...{
        tokens: { childrenGap: 15 },
        styles: { root: { paddingLeft: 40, width: 300 } },
      }}>
        <TextField
          label="Starting Cash"
          type="number"
          defaultValue={startingCash.toString()}
          onChange={(event, value) => setStartingCash(Number(value))}
        />
        <TextField
          label="Monthly Income (available for either rent or investing)"
          type="number"
          defaultValue={monthlyIncome.toString()}
          onChange={(event, value) => setMonthlyIncome(Number(value))}
        />
        <TextField
          label="Current Rent Cost"
          type="number"
          defaultValue={currentRent.toString()}
          onChange={(event, value) => setCurrentRent(Number(value))}
        />
        <TextField
          label="Expected House Cost"
          type="number"
          defaultValue={expectedHouseCost.toString()}
          onChange={(event, value) => setExpectedHouseCost(Number(value))}
        />
        <TextField
          label="Years"
          type="number"
          defaultValue={years.toString()}
          onChange={(event, value) => setYears(Number(value))}
        />
        <PrimaryButton type="submit">Calculate</PrimaryButton>
      </Stack>
    </form>
  );
}

// Define a component to render the whole app
function App() {
  // Define a state variable to store the input data
  const [inputData, setInputData] = useState<InputData | null>(null);

  // Define a function to handle the input form submission
  function handleInputSubmit(data: InputData) {
    setInputData(data); // Set the input data state variable to the submitted data
  }

  // Return the JSX element for the app
  return (
    <div className="App">
      <h1 style={{ textAlign: "center" }}>Money Calculator</h1>
      <Stack horizontal horizontalAlign="space-around">
        <InputForm onSubmit={handleInputSubmit} />
        <Stack style={{ width: 600, maxWidth: 600 }}>
          {inputData && (
            <>
              <Pivot>
                <PivotItem headerText="Table">
                  <OutputTable data={calculateOutput(inputData, "rent")} title="Renting" />
                  <OutputTable data={calculateOutput(inputData, "buy5")} title="Buying with 5% Down Payment" />
                  <OutputTable data={calculateOutput(inputData, "buy20")} title="Buying with 20% Down Payment" />
                </PivotItem>
                <PivotItem headerText="Chart">
                  <OutputChart data={calculateOutput(inputData, "rent")} title="Renting" />
                  <OutputChart data={calculateOutput(inputData, "buy5")} title="Buying with 5% Down Payment" />
                  <OutputChart data={calculateOutput(inputData, "buy20")} title="Buying with 20% Down Payment" />
                </PivotItem>
                <PivotItem headerText="Summary">
                  <OutputSummary data={inputData} />
                </PivotItem>
              </Pivot>
            </>
          )}
        </Stack>
      </Stack>
    </div>
  );
}

export default App;