import React, { useState } from 'react';
import { Row, Col, Divider } from 'antd';
import { FormProps } from 'antd/lib/form/Form';
import RcResizeObserver from 'rc-resize-observer';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import BaseForm, { CommonFormProps } from '../../BaseForm';
import Actions from './Actions';

/**
 * 配置表单列变化的容器宽度断点
 */
const BREAKPOINTS = {
  vertical: [
    // [breakpoint, cols, layout]
    [513, 1, 'vertical'],
    [785, 2, 'vertical'],
    [1057, 3, 'vertical'],
    [Infinity, 4, 'vertical'],
  ],
  default: [
    [513, 1, 'vertical'],
    [701, 2, 'vertical'],
    [1062, 2, 'horizontal'],
    [1352, 3, 'horizontal'],
    [Infinity, 4, 'horizontal'],
  ],
};

/**
 * 合并用户和默认的配置
 * @param layout
 * @param width
 */
const getSpanConfig = (
  layout: FormProps['layout'],
  width: number,
  span?: number,
): { span: number; layout: FormProps['layout'] } => {
  if (span) {
    return {
      span,
      layout,
    };
  }
  const breakPoint = BREAKPOINTS[layout || 'default'].find(
    (item: [number, number, FormProps['layout']]) => width < item[0] + 16, // 16 = 2 * (ant-row -8px margin)
  );
  return {
    span: 24 / breakPoint[1],
    layout: breakPoint[2],
  };
};

export interface QueryFilterProps extends FormProps, CommonFormProps {
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  labelLayout?: 'default' | 'growth' | 'vertical';
  defaultColsNumber?: number;
  labelWidth?: number | 'auto';
  split?: boolean;
  span?: number;
}

const QueryFilter: React.FC<QueryFilterProps> = (props) => {
  const {
    collapsed: controlCollapsed,
    defaultCollapsed = false,
    layout,
    defaultColsNumber,
    span,
    onCollapse,
    labelWidth = 98,
    style,
    split,
    ...rest
  } = props;
  const [collapsed, setCollapsed] = useMergedState<boolean>(defaultCollapsed, {
    value: controlCollapsed,
    onChange: onCollapse,
  });
  // use style.width as the defaultWidth for unit test
  const defaultWidth: number = (typeof style?.width === 'number' ? style?.width : 1024) as number;
  const [spanSize, setSpanSize] = useState<{
    span: number;
    layout: FormProps['layout'];
  }>(() => getSpanConfig(layout, defaultWidth + 16, span));
  const showLength =
    defaultColsNumber !== undefined ? defaultColsNumber : Math.max(1, 24 / spanSize.span - 1);
  let labelFlexStyle;
  if (labelWidth && spanSize.layout !== 'vertical' && labelWidth !== 'auto') {
    labelFlexStyle = `0 0 ${labelWidth}px`;
  }

  return (
    <BaseForm
      {...rest}
      style={style}
      layout={spanSize.layout}
      fieldProps={{
        style: {
          width: '100%',
        },
      }}
      formItemProps={{
        labelCol: {
          flex: labelFlexStyle,
        },
      }}
      groupProps={{
        titleStyle: {
          display: 'inline-block',
          marginRight: 16,
        },
        titleRender: (title) => `${title}:`,
      }}
      contentRender={(items, submitter) => {
        const itemsWithInfo: {
          span: number;
          hidden: boolean;
          element: React.ReactNode;
          key: string | number;
        }[] = [];
        // totalSpan 统计控件占的位置，计算 offset 保证查询按钮在最后一列
        let totalSpan = 0;
        let lastVisibleItemIndex = items.length - 1;
        items.forEach((item: React.ReactNode, index: number) => {
          let hidden: boolean = false;
          const colSize = React.isValidElement(item) ? item.props?.colSize || 1 : 1;
          const colSpan = Math.min(spanSize.span * colSize, 24);

          if (collapsed && index >= showLength) {
            hidden = true;
          } else {
            if (24 - (totalSpan % 24) < colSpan) {
              // 如果当前行空余位置放不下，那么折行
              totalSpan += 24 - (totalSpan % 24);
            }
            totalSpan += colSpan;
            lastVisibleItemIndex = index;
          }

          itemsWithInfo.push({
            span: colSpan,
            element: item,
            key: React.isValidElement(item) ? item.props?.name || index : index,
            hidden,
          });
        });
        // for split compute
        let currentSpan = 0;

        return (
          <RcResizeObserver
            key="resize-observer"
            onResize={({ width }) => {
              setSpanSize(getSpanConfig(layout, width, span));
            }}
          >
            <Row gutter={16} justify="start" key="resize-observer-row">
              {itemsWithInfo.map((item, index) => {
                if (React.isValidElement(item.element) && item.hidden) {
                  return React.cloneElement(item.element, {
                    hidden: true,
                    key: item.key || index,
                  });
                }
                currentSpan += item.span;
                const colItem = (
                  <Col key={item.key} span={item.span}>
                    {item.element}
                  </Col>
                );
                if (split && currentSpan % 24 === 0 && index < lastVisibleItemIndex) {
                  return [
                    colItem,
                    <Divider key="line" style={{ marginTop: -8, marginBottom: 16 }} dashed />,
                  ];
                }
                return colItem;
              })}
              {submitter && (
                <Col
                  span={spanSize.span}
                  offset={24 - spanSize.span - (totalSpan % 24)}
                  style={{
                    textAlign: 'right',
                  }}
                >
                  <Actions
                    showCollapseButton={items.length >= showLength}
                    submitter={submitter}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    style={{
                      // 当表单是垂直布局且提交按钮不是独自在一行的情况下需要设置一个 paddingTop 使得与控件对齐
                      paddingTop: layout === 'vertical' && totalSpan % 24 ? 30 : 0,
                      // marginBottom 是为了和 FormItem 统一让下方保留一个 24px 的距离
                      marginBottom: 24,
                    }}
                  />
                </Col>
              )}
            </Row>
          </RcResizeObserver>
        );
      }}
    />
  );
};

export default QueryFilter;
